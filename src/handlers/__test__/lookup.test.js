const LookupHandler = require('../lookup');

describe('LookupHandler', () => {
    
    let sut;
    let deviceKey='0xdeviceKey'
    let identityManagerMgrMock={ getIdentityCreation: jest.fn()};

    beforeAll(() => {
        sut = new LookupHandler(identityManagerMgrMock);
    });

    test('empty constructor', () => {
        expect(sut).not.toBeUndefined();
    });

    test('handle null body', done => {
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
        }
        sut.handle(event,{},(err,res)=>{
            expect(err).not.toBeNull()
            expect(err.code).toEqual(400)
            expect(err.message).toEqual('deviceKey parameter missing')
            done();
        })
    })

    test('call identityManagerMgr.getIdentityCreation()', done => {
        let event={
            deviceKey: deviceKey
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalled();
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalledWith(deviceKey);
            done();
        })
    })

    test('catch exception', done => {
        identityManagerMgrMock.getIdentityCreation.mockImplementation(()=>{
            throw("throwed error")
        });
        let event={
            deviceKey: deviceKey
        }
        sut.handle(event,{},(err,res)=>{
            expect(identityManagerMgrMock.getIdentityCreation).toBeCalled();
            expect(err).not.toBeNull()
            expect(err.code).toEqual(500)
            expect(err.message).toEqual('throwed error')
            done();
        })
    })

});