import { IObjectMap, ReadConfigRouteOption } from "src/shared";

export const getDefaultPrimaryIndex = (adapterId?: string): IObjectMap<1 | -1> => {
    adapterId = 'mongodb'; // only mongodb for now
    
    switch (adapterId) {
        case 'mongodb': {
            return { _id: 1 };
        }

        default: {
            return { _id: 1 };
        }
    }
}

export const getPropertyValue = (value: any): any => {
    switch (typeof value) {
        case 'string': {
            return 'test';
        }

        case 'number': {
            return 12345;
        }

        case 'boolean': {
            return true;
        }

        // defaults to string
        default: {
            return 'test';
        }
    }
}

export const isIndexRequired = (options: ReadConfigRouteOption): boolean => {
    return !!options.sort;
}

export const getRandomString = (size: number = 5): string => {
    const result: string[] = [];
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charSize = possibleCharacters.length;

    for (let i = 0; i < size; i++) {
        result.push(
            possibleCharacters.charAt(Math.floor(Math.random() * charSize))
        );
    }

    return result.join('');
}
