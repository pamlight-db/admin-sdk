import { connect } from 'socket.io-client';
import { sdkConfig } from './config';
import {
    PamlightAdminCredentials, PamlightApiCommand,
    PamlightAdminActionTypes, ReadConfigRouteOption,
    PamlightApiResponse,
    SocketRequestPayload,
    PamlightConstants,
    WriteConfigRouteOption
} from '../shared';
import { getRandomString } from '../services';
import { find } from 'lodash';

enum ConnectionStatusTypes {
    IDLE = 1,
    PROGRESS,
    SUCCESS,
    FAILURE
}

export class ServerSocketIOClient {
    private connectionStatus: ConnectionStatusTypes;
    private isReconnection = false;
    private socket: SocketIOClient.Socket;
    private credentials: PamlightAdminCredentials;
    private _routes: { reads: ReadConfigRouteOption[], writes: WriteConfigRouteOption[]; };

    constructor(cred: PamlightAdminCredentials) {
        this.connectionStatus = ConnectionStatusTypes.IDLE;
        this.credentials = cred;
    }

    public request(payload: PamlightApiCommand): Promise<any> {
        return new Promise((resolve, reject) => {
            payload.responseId = payload.responseId || `${Date.now()}_${getRandomString(40)}`;

            // listens to response
            this.socket.once(payload.responseId, (res: PamlightApiResponse) => {
                if (res.error) {
                    reject(res.error);
                } else {
                    resolve(res.data);
                }
            });

            // dispatch action
            this.socket.emit(PamlightConstants.ADMIN_SOCKET_API_ACTION, payload);
        });
    }

    public toggleAppState(status: boolean, readRoutes?: ReadConfigRouteOption[], writeRoutes?: WriteConfigRouteOption[]): Promise<any> {
        return new Promise(async (resolve, reject) => {
            // Make a post request to token endpoint
            const options: PamlightApiCommand = {
                action: status ? PamlightAdminActionTypes.START_APP : PamlightAdminActionTypes.STOP_APP,
                body: { readRoutes, writeRoutes }
            };

            try {
                await this.request(options);

                if (status) {
                    // for reads
                    this.socket.on(PamlightConstants.ADMIN_SOCKET_GET_QUERY, (params: SocketRequestPayload) => {
                        const route: ReadConfigRouteOption = find(this._routes.reads, { routeId: params.routeId });

                        if (route) {
                            try {
                                const query = route.queryFn(params.body);
                                this.socket.emit(params.responseId, { data: query });
                            } catch (e) {
                                this.socket.emit(params.responseId, { error: { message: e ? e.message : 'Unknown error' } });
                            }
                        } else {
                            this.socket.emit(params.responseId, { error: { message: 'Invalid route request' } });
                        }
                    });

                    // for writes
                    this.socket.on(PamlightConstants.ADMIN_SOCKET_WRITE_CONFIG, async (params: SocketRequestPayload) => {
                        const route: WriteConfigRouteOption = find(this._routes.writes, { routeId: params.routeId });

                        if (route) {
                            try {
                                const query = await route.docFn(params.body.clientData, params.body.parentData);
                                this.socket.emit(params.responseId, { data: query });
                            } catch (e) {
                                this.socket.emit(params.responseId, { error: { message: e ? e.message : 'Unknown error' } });
                            }
                        } else {
                            this.socket.emit(params.responseId, { error: { message: 'Invalid write route request' } });
                        }
                    });
                } else {
                    this.socket.off(PamlightConstants.ADMIN_SOCKET_GET_QUERY);
                    this.socket.off(PamlightConstants.ADMIN_SOCKET_WRITE_CONFIG);
                }

                resolve();
            } catch (e) {
                reject(e);
            }

            this._routes = { reads: readRoutes, writes: writeRoutes };
        });
    }

    private handleSocketConnection(cb?: () => void) {
        this.connectionStatus = ConnectionStatusTypes.PROGRESS;

        this.socket.once('connect', () => {
            this.socket.on(PamlightConstants.ADMIN_SOCKET_VERIFIED, () => {
                this.connectionStatus = ConnectionStatusTypes.SUCCESS;

                if (this.isReconnection) {
                    this.toggleAppState(!!this._routes, this._routes.reads, this._routes.writes).then(() => { });
                } else if (cb) {
                    cb();
                }

                this.isReconnection = false;
            });

            this.socket.on(PamlightConstants.ADMIN_SOCKET_VERIFY_ERROR, (err: any) => {
                this.connectionStatus = ConnectionStatusTypes.FAILURE;
                throw Error(err);
            });

            this.socket.emit(PamlightConstants.ADMIN_VERIFY_SOCKET, this.credentials);
        });

        this.socket.once('disconnect', () => {
            this.isReconnection = true;
            this.handleSocketConnection();
        });
    }

    public ensureConnection(): Promise<void> {
        switch (this.connectionStatus) {
            case ConnectionStatusTypes.IDLE: {
                // initialize connection
                return new Promise(resolve => {
                    const opts: SocketIOClient.ConnectOpts = {
                        reconnection: true,
                        query: {
                            isAdmin: 'true'
                        }
                    };

                    this.socket = connect(sdkConfig.sdkDomain, opts);

                    this.handleSocketConnection(resolve);
                });
            }

            case ConnectionStatusTypes.PROGRESS: {
                return new Promise((resolve, reject) => {
                    let counter = 0;
                    const interval = setInterval(() => {
                        counter++;

                        // max 10 seconds is enough for progress state
                        if (counter >= 20) {
                            this.connectionStatus = ConnectionStatusTypes.FAILURE;
                        }

                        if (this.connectionStatus !== ConnectionStatusTypes.PROGRESS) {
                            clearInterval(interval);
                            this.ensureConnection().then(resolve).catch(reject);
                        }
                    }, 500);
                });
            }

            case ConnectionStatusTypes.SUCCESS: {
                return Promise.resolve();
            }

            default: {
                return Promise.reject('Unable to establish connection to Pamlight service');
            }
        }
    }
}
