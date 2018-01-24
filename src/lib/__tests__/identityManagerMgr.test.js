jest.mock('truffle-contract')
import Contract from 'truffle-contract'
let contractMock={
    setProvider: jest.fn(),
    deployed:jest.fn()
}
Contract.mockImplementation(()=>{return contractMock});
const IdentityManagerMgr = require('../identityManagerMgr')

describe('IdentityManagerMgr', () => {

    let sut;
    let mockEthereumMgr={
        getProvider: jest.fn()
    };
    
    beforeAll(() => {
        sut = new IdentityManagerMgr(mockEthereumMgr);
        mockEthereumMgr.getProvider.mockImplementation(() => { return {} } )

        contractMock.deployed.mockImplementation(() =>{
            return {
                getNonce: () => { return 0}
            }
        })
    });

    test('empty constructor', () => {
        expect(sut).not.toBeUndefined();
        expect(sut.ethereumMgr).not.toBeUndefined();
        expect(sut.identityManagers).not.toBeUndefined();
    });

    describe.skip('initIdentityManager()', () => {

        test('no networkName', (done) => {
            sut.initIdentityManager()
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no networkName')
                done()
            })
        })
    
        test('null provider for networkName', (done) => {
            mockEthereumMgr.getProvider.mockImplementationOnce(()=>{ 
                return null;   
            })
            sut.initIdentityManager('nonExistentNetworkName')
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('null provider')
                done()
            })
        })

        test('happy path', (done) => {
            sut.initIdentityManager('network')
            .then((resp)=> {
                expect(contractMock.setProvider).toHaveBeenCalled()
                expect(contractMock.deployed).toHaveBeenCalled()
                done()
            })
        })
    
    })


    describe.skip('createIdentity()', () => {
        
        test('no address', (done) => {
            sut.createIdentity(null,'networkName')
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no address')
                done()
            })
        })

        test('no networkName', (done) => {
            sut.createIdentity('address',null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no networkName')
                done()
            })
        })

        test('happy path', (done) => {
            sut.createIdentity('address','network')
            .then((resp)=> {
                expect(resp).toEqual('0')
                done()
            })
        })
    })


})