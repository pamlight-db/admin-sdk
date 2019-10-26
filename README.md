# Pamlight Admin SDK

[Pamlight](https://pamlight.com) is a service for managing realtime connections to your database with whatever technology it is powered by. This tool (Admin SDK) is vital for creating secured communication channel between your server and the Pamlight core server.

## Support/Compatibility
* **Node.js support** - Supports Node.js v6.x and higher.
* **Support mongodb adapter** - Implementation for streaming mongodb data changes to clients.

## Getting started
For more detailed instructions and guides on how Pamlight works, see our [official documentations here](https://pamlight.com) as well as [creating new projects](https://pamlight.com).

#### Installation
Install pamlight admin sdk via npm by running the following command: 
> `npm install @pamlight/admin`

#### Setup
> import { PamlightAdmin, PamlightDBWriteTypes } from '@pamlight/admin';

> const credentials = {  
&nbsp;&nbsp;&nbsp;&nbsp;projectId: _`<PROJECT_ID>`_,  
&nbsp;&nbsp;&nbsp;&nbsp;projectKey: _`<SECRET_KEY>`_  
};  
> const admin = new PamlightAdmin(credentials);`

#### configure routes for read operations
> const readConfig = {  
&nbsp;&nbsp;&nbsp;&nbsp;routeId: 'GET_USERS_ROUTE',  
&nbsp;&nbsp;&nbsp;&nbsp;collection: 'users',  
&nbsp;&nbsp;&nbsp;&nbsp;isSingleDocument: false  
};

> admin.reads.route(routeConfig);

#### configure routes for write operations
> const writeConfig = {  
&nbsp;&nbsp;&nbsp;&nbsp;routeId: 'UPDATE_USER',  
&nbsp;&nbsp;&nbsp;&nbsp;collection: 'users',  
&nbsp;&nbsp;&nbsp;&nbsp;isSingleDocument: false,  
&nbsp;&nbsp;&nbsp;&nbsp;writeType: PamlightDBWriteTypes.UPDATE_DOCUMENT,  
&nbsp;&nbsp;&nbsp;&nbsp;docFn: (payload) => {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;return {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;query: { _id: payload._id },  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;payload: { $set: payload }  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;};  
&nbsp;&nbsp;&nbsp;&nbsp;}  
};

> admin.writes.route(writeConfig);

#### start service after route configurations
> admin.start().then(() => {  
&nbsp;&nbsp;&nbsp;&nbsp;console.log('Pamlight service started');  
}).catch(err => {  
&nbsp;&nbsp;&nbsp;&nbsp;throw Error(err);  
});

### Further Reading
For further reading and information, check more [anvanced read operations](https://pamlight.com) as well as [advanced write operations](https://pamlight.com)
