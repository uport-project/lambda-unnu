const CreateIdentityHandler = require('../createIdentity');

describe('CreateIdentityHandler', () => {
    
    let sut;
    let deviceKey='0xdeviceKey'
    let recoveryKey='0xrecoveryKey'
    let authMgrMock={ verifyFuelToken: jest.fn()};
    let identityManagerMgrMock={ 
        getIdentityCreation: jest.fn(),
        createIdentity: jest.fn()
    };

    beforeAll(() => {
        sut = new CreateIdentityHandler(authMgrMock,identityManagerMgrMock);
    });

    test('empty constructor', () => {
        expect(sut).not.toBeUndefined();
    });

    test('handle failed authMgr.verifyFuelToken', done => {
        authMgrMock.verifyFuelToken.mockImplementation(()=>{
            throw Error("throwed error")
        });
        sut.handle(null,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(401)
            expect(err.message).toEqual('throwed error')
            done();
        })
    });

    test('handle null body', done => {
        authMgrMock.verifyFuelToken.mockImplementation(()=>{
            return {sub: '0xfuelTokenAddress'}
        });
        sut.handle(undefined,null,(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('no json body')
            done();
        })
    });

    test('handle empty deviceKey', done => {
        let event={
            deviceKey: null,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'anyType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('deviceKey parameter missing')
            done();
        })
    })

    test('handle empty recoveryKey', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: null,
            blockchain: 'blockchain',
            managerType: 'anyType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('recoveryKey parameter missing')
            done();
        })
    })

    test('handle empty blockchain', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: null,
            managerType: 'anyType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('blockchain parameter missing')
            done();
        })
    })

    test('handle empty managerType', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: null
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('managerType parameter missing')
            done();
        })
    })

    test('handle bad managerType', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'badManagerType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('managerType parameter invalid')
            done();
        })
    })

    test('handle bad payload', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager',
            payload: {
                bad: 'data'
            }
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('payload given but missing destination or data')
            done();
        })
    })

    test('handle token mismatch', done => {
        authMgrMock.verifyFuelToken.mockImplementation(()=>{ return {sub: '0xnotDeviceKey'} });
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(403)
            expect(err.message).toEqual('Auth token mismatch. Does not match with deviceKey')
            done();
        })
    })

    test('handle identityManagerMgr.getIdentityCreation() error', done => {
        authMgrMock.verifyFuelToken.mockImplementation(()=>{ return {sub: deviceKey} })
        identityManagerMgrMock.getIdentityCreation.mockImplementation(()=>{ throw("error")})
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager'
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalled();
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalledWith(deviceKey);
            expect(err).not.toBeNull();
            expect(err.code).toEqual(500);
            expect(err.message).toEqual('error')
            done();
        })
    })

    test('handle deviceKey allready used', done => {
        identityManagerMgrMock.getIdentityCreation.mockImplementation(()=>{ 
            return {
                manager_address: '0xmanagerAddr', 
                manager_type: 'IdentityManager', 
                tx_hash: '0xtxHash'} 
            })
        authMgrMock.verifyFuelToken.mockImplementation(()=>{ return {sub: deviceKey} })
        let event={
            hello: 'hello',
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager'
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalled();
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalledWith(deviceKey);
            expect(err).toBeNull();
            expect(res.managerType).toEqual('IdentityManager')
            expect(res.managerAddress).toEqual('0xmanagerAddr')
            expect(res.txHash).toEqual('0xtxHash')
            done();
        })
    })

    test('handle identityManagerMgr.createIdentity() error', done => {
        identityManagerMgrMock.getIdentityCreation.mockImplementation(()=>{ return null})
        identityManagerMgrMock.createIdentity.mockImplementation(()=>{ throw({message:"error"})})
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager'
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.createIdentity).toBeCalled();
            expect(identityManagerMgrMock.createIdentity).toBeCalledWith(event);
            expect(err).not.toBeNull();
            expect(err.code).toEqual(500);
            expect(err.message).toEqual('error')
            done();
        })
    })

    test('happy path', done => {
        identityManagerMgrMock.createIdentity.mockImplementation(()=>{ 
            return {
                managerAddress: '0xmanagerAddr',
                txHash: '0xtxHash'
            } 
        })
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'IdentityManager'
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).toBeNull();
            expect(res.managerType).toEqual('IdentityManager')
            expect(res.managerAddress).toEqual('0xmanagerAddr')
            expect(res.txHash).toEqual('0xtxHash')
            done();
        })
    })

    
});