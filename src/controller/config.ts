const config = {
    production: false,
    sdkDomain: 'http://localhost:8002'
};

if (config.production) {
    config.sdkDomain = 'production url here';
}

export const sdkConfig = config;