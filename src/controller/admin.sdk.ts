import { ReadConfigRouteOption, PamlightAdminCredentials, IObjectMap, WriteConfigRouteOption, WriteDocOption, RouteTypes } from '../shared';
import { keys, values } from 'lodash';
import { getDefaultPrimaryIndex, isIndexRequired } from '../services';
import { ServerSocketIOClient } from './socket';

interface ReadRouteConfigModel {
    route: (config: ReadConfigRouteOption) => void;
    routes: (configs: ReadConfigRouteOption[]) => void;
}

interface WriteRouteConfigModel {
    route: (config: WriteConfigRouteOption) => void;
    routes: (configs: WriteConfigRouteOption[]) => void;
}

export class PamlightAdmin {
    public reads: ReadRouteConfigModel;
    public writes: WriteRouteConfigModel;

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
        this.setupRoutesModel();
    }

    public enableDevMode(): void {
        this.client.enableDevMode();
    }

    public configure(key: string, val: any): void {
        this._settings[key] = val;
    }

    public route(route: ReadConfigRouteOption | WriteConfigRouteOption): void {
        if (route.type === RouteTypes.READ) {
            this.reads.route(route as ReadConfigRouteOption);
        } else if (route.type === RouteTypes.WRITE) {
            this.writes.route(route as WriteConfigRouteOption);
        } else {
            throw Error(`Invalid route type ${JSON.stringify(route)}`);
        }
    }

    public routes(...rs: ReadConfigRouteOption[] | WriteConfigRouteOption[]): void {
        rs.forEach((r: ReadConfigRouteOption | WriteConfigRouteOption) => this.route(r));
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.appStarted) {
                reject(new Error('Pamlight app instance run method called more than once'));
            } else {
                this.appStarted = true;

                if (keys(this._readRoutesMap).length === 0) {
                    console.warn('Starting pamlight app without any read route configured');
                }

                if (keys(this._writeRoutesMap).length === 0) {
                    console.warn('Starting pamlight app without any write route configured');
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

    /* Private members */
    private validateRouteID(routeId: string): string {
        if (/\W/.test(routeId)) {
            return `Unacceptable routeId in ${routeId}`;
        }

        return null;
    }

    private configureReadRoute(config: ReadConfigRouteOption): void {
        if (!config.routeId) {
            throw Error(`Route ID is a required property for read configuration`);
        }

        const routeErr = this.validateRouteID(config.routeId);
        if (routeErr) {
            throw Error(routeErr);
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
            throw Error(`Error at ${config.routeId} config. Query result projection must not exclude primary key.`);
        }

        // sets default sort if skip and/or limit operators are applied
        // if ((config.skip || config.limit) && !config.sort) {
        //     config.sort = getDefaultPrimaryIndex();
        // }

        // indexable queries cannot be used on single document queries
        if (isIndexRequired(config) && config.isSingleDocument) {
            throw Error(
                `Indexable query options (sort) cannot be applied to single document query`
            );
        }

        this._readRoutesMap[config.routeId] = config;
    }

    private configureWriteRoute(config: WriteConfigRouteOption): void {
        if (!config.routeId) {
            throw Error(`Route ID is a required property for write configuration`);
        }

        const routeErr = this.validateRouteID(config.routeId);
        if (routeErr) {
            throw Error(routeErr);
        }

        if (this._writeRoutesMap[config.routeId]) {
            throw Error(`Route ID: ${config.routeId} already configured for write operation`);
        }

        // adds default values to config
        config.triggers = config.triggers || [];
        if (!config.docFn) {
            config.docFn = (queryData: any, updateData: any): Promise<WriteDocOption> => {
                return Promise.resolve({ query: queryData, payload: updateData });
            };
        }

        this._writeRoutesMap[config.routeId] = config;
    }

    private setupRoutesModel(): void {
        this.reads = {
            route: (config: ReadConfigRouteOption): void => {
                this.configureReadRoute(config);
            },
            routes: (configs: ReadConfigRouteOption[]): void => {
                for (const config of configs) {
                    this.configureReadRoute(config);
                }
            }
        };

        this.writes = {
            route: (config: WriteConfigRouteOption): void => {
                this.configureWriteRoute(config);
            },
            routes: (configs: WriteConfigRouteOption[]): void => {
                for (const config of configs) {
                    this.configureWriteRoute(config);
                }
            }
        };
    }

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
}
