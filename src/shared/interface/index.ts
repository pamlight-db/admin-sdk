import { PamlightAdminActionTypes, PamlightDBWriteTypes } from '../enums';

export interface IObjectMap<T> {
    [key: string]: T;
}

export interface SocketRequestPayload {
    body?: any; // data sent from client
    responseId: string;
    routeId?: string;

    // for write operation
    getDoc?: boolean;
}

export interface PamlightApiCommand {
    body: IObjectMap<any>;
    action: PamlightAdminActionTypes;
    responseId?: string;
}

export interface PamlightApiError {
    message: string;
    code: number;
    date: Date;
}

export interface PamlightAdminCredentials {
    projectId: string;
    projectKey: string;
}

export interface PamlightApiResponse {
    error?: PamlightApiError;
    timestamp: Date;
    data?: any;
}

export interface WriteDocOption {
    query?: IObjectMap<any>;
    payload?: any;
    upsert?: boolean;
    result?: any;     // result to return to user when done execution
    customData?: any; // data user wants to pass from one route to another E.g trigger
    error?: any;      // error body if any occurs during the execution flow
}

export interface WriteConfigRouteOption {
    routeId: string;
    collection?: string;
    writeType?: PamlightDBWriteTypes;

    /* If called by a trigger, prev is the result of the previous route that triggered it */
    docFn: (clientData: any, parentData?: WriteDocOption) => Promise<WriteDocOption>;

    triggers?: string[]; // an array of routeIds to be triggered by this route in specified order
}

export interface ReadConfigRouteOption {
    routeId: string;
    collection: string;
    queryFn?: (payload: any) => IObjectMap<any>;
    limit?: number;
    sort?: IObjectMap<1 | -1>;
    skip?: number;
    projection?: IObjectMap<boolean>;
    isSingleDocument?: boolean; // determines whether the result is array or single document. defaults to false
}
