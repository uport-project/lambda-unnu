const CreateIdentityHandler = require('../createIdentity');

describe('CreateIdentityHandler', () => {
    
    let sut;
    let deviceKey='0xdeviceKey'
    let recoveryKey='0xrecoveryKey'
    let authMgrMock={ verifyNisaba: jest.fn()};
    let identityManagerMgrMock={ createIdentity: jest.fn()};

    beforeAll(() => {
        sut = new CreateIdentityHandler(authMgrMock,identityManagerMgrMock);
    });

    test('empty constructor', () => {
        expect(sut).not.toBeUndefined();
    });

    test('handle failed authMgr.verifyNisaba', done => {
        authMgrMock.verifyNisaba.mockImplementation(()=>{
            throw("throwed error")
        });
        sut.handle(null,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(401)
            expect(err.message).toEqual('throwed error')
            done();
        })
    });

    test('handle null body', done => {
        authMgrMock.verifyNisaba.mockImplementation(()=>{
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

    test.skip('call identityManagerMgr.createIdentity()', done => {
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'anyType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.createIdentity).toBeCalled();
            expect(identityManagerMgrMock.createIdentity).toBeCalledWith(funCaptchaToken);
            done();
        })
    })

    test.skip('catch exception', done => {
        identityManagerMgrMock.createIdentity.mockImplementation(()=>{
            throw("throwed error")
        });
        let event={
            deviceKey: deviceKey,
            recoveryKey: recoveryKey,
            blockchain: 'blockchain',
            managerType: 'anyType'
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.createIdentity).toBeCalled();
            expect(err).not.toBeNull()
            expect(err).toEqual('throwed error')
            done();
        })
    })

});