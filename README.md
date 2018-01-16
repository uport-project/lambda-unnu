# lambda-unnu

# uport-unnu
Creator of Identities

[Diagrams](./diagrams/README.md)

## Description
Unnu is a server part of the uport-framework. The main feature is to create the initial uPort contract structure for a device key.

## API Description

### Create uPort identity
Calls the IdentityFactory, IdentityManager, or MetaIdentityManager contract to create the initial controller and proxy contract(uPortId). The proxy contract is configured to be controlled by the deviceKey. The identity factory is called in the blockchain specified by blockchain body data. If unnu does not know how to access the blockchain it returns a 404 status.

The endpoints are private, only valid tokens from nisaba are allowed.

### Endpoint createIdentity

`POST /createIdentity`

This endpoint uses v2 of the (Meta)IdentityManager. It also allows you to make an arbitrary call from the newly created identity.

#### Header
```
Authorization: Bearer <jwt token>
```

#### Body
```
{
  deviceKey: <device key>,
  recoveryKey: <recovery key>,
  payload: {
    destination: <address>,
    data: <calldata>
  },
  blockchain: <blockchain name>,
  managerType: < "IdentityManager" | "MetaIdentityManager" >
}
```
Note that payload here is optional. If not given, an identity will be created without a call.

#### Response

| Status |     Message    |                               |
|:------:|----------------|-------------------------------|
| 200    | Ok.            | uPort contracts created       |
| 403    | Forbidden      | JWT token missing or invalid  |
| 404    | Not found      | Blockchain not found          |
| 500    | Internal Error | Internal error                |

#### Response data
```
{
  managerType: < "IdentityManager" | "MetaIdentityManager" >,
  managerAddress: <address>,
  txHash: <tx hash>
}
```
