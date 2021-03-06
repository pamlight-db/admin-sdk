import { ReadConfigRouteOption, PamlightAdminCredentials, IObjectMap, WriteConfigRouteOption, WriteDocOption } from '../shared';
import { keys, values } from 'lodash';
import { getDefaultPrimaryIndex, isIndexRequired } from '../services';
import { ServerSocketIOClient } from './socket';

export class PamlightAdmin {
    private appStarted: boolean;
    private _readRoutesMap: IObjectMap<ReadConfigRouteOption>;
    private _writeRoutesMap: IObjectMap<WriteConfigRouteOption>;
    private _settings: IObjectMap<any>;
    private client: ServerSocketIOClient; 

    constructor(credentials: PamlightAdminCredentials) {
        this._readRoutesMap = {};
        this._writeRoutesMap = {};
        this.client = new ServerSocketIOClient(credentials);

        this._settings = {};
    }

    public configure(key: string, val: any): void {
        this._settings[key] = val;
    }

    private configureReadRoute(config: ReadConfigRouteOption): void {
        if (!config.routeId) {
            throw Error(`Route ID is a required property for read configuration`);
        }

        if (this._readRoutesMap[config.routeId]) {
            throw Error(`Route ID: ${config.routeId} already configured for read operation`);
        }

        // adds default values to config
        config = Object.assign({}, {
            queryFn: () => {
                return {};
            },
            skip: 0,
            projection: {}
        }, config);

        // _id must not be false or -1 if projection is applied because
        // _id is currently the only way to identify unique document on the client
        const projection: IObjectMap<any> = config.projection;
        if (projection && (projection._id === false || projection._id === -1)) {
            throw Error(`Error at ${config.routeId} config. Query projection must not exclude primary key of this collection.`);
        }

        // sets default sort if skip and/or limit operators are applied
        if ((config.skip || config.limit) && !config.sort) {
            config.sort = getDefaultPrimaryIndex();
        }

        // indexable queries cannot be used on single document queries
        if (isIndexRequired(config) && config.isSingleDocument) {
            throw Error(
                `Indexable query options (sort, limit, filter) cannot be applied to single document query`
            );
        }

        if (config.sort && config.sort !== getDefaultPrimaryIndex()) {
            throw Error('Routes that require database index to be created are not supported yet!');
        }

        this._readRoutesMap[config.routeId] = config;
    }

    private configureWriteRoute(config: WriteConfigRouteOption): void {
        if (!config.routeId) {
            throw Error(`Route ID is a required property for write configuration`);
        }

        if (this._writeRoutesMap[config.routeId]) {
            throw Error(`Route ID: ${config.routeId} already configured for write operation`);
        }

        // adds default values to config
        config.triggers = config.triggers || [];
        if (!config.docFn) {
            config.docFn = (queryData: any, updateData: any): Promise<WriteDocOption> => {
                return Promise.resolve({ query: queryData, payload: updateData });
            }
        }

        this._writeRoutesMap[config.routeId] = config;
    }

    public reads = {
        route: (config: ReadConfigRouteOption): void => {
            this.configureReadRoute(config);
        },
        routes: (configs: ReadConfigRouteOption[]): void => {
            for (const config of configs) {
                this.configureReadRoute(config);
            }
        }
    };

    public writes = {
        route: (config: WriteConfigRouteOption): void => {
            this.configureWriteRoute(config);
        },
        routes: (configs: WriteConfigRouteOption[]): void => {
            for (const config of configs) {
                this.configureWriteRoute(config);
            }
        }
    };

    private checkWriteRoutes(): string {
        const routes = values(this._writeRoutesMap);

        for (const route of routes) {
            for (const triggeredId of route.triggers) {
                if (!this._writeRoutesMap[triggeredId]) {
                    return `'${triggeredId}' is not a valid routeId as trigger for '${route.routeId}'`;
                }
            }
        }

        return null;
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.appStarted) {
                reject(new Error('Pamlight app instance run method called more than once'));
            } else {
                this.appStarted = true;

                if (keys(this._readRoutesMap).length === 0) {
                    console.error('Starting pamlight app without any read route configured');
                }

                if (keys(this._writeRoutesMap).length === 0) {
                    console.error('Starting pamlight app without any write route configured');
                }

                const routeErr = this.checkWriteRoutes();
                if (routeErr) {
                    reject(new Error(routeErr));
                } else {
                    this.client.ensureConnection().then(() => {
                        return this.client.toggleAppState(true, values(this._readRoutesMap), values(this._writeRoutesMap));
                    }).then(() => {
                        resolve();
                    }).catch(err => {
                        reject(err.error || err);
                    });
                }
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.appStarted = false;

            this.client.ensureConnection()
                .then(() => this.client.toggleAppState(false))
                .then(() => {
                    resolve();
                }).catch(err => {
                    reject(err.error || err);
                });
        });
    }
}
