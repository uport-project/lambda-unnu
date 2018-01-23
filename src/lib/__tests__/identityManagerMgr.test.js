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

      describe('initIdentityManager', () => {

        test('no managerType', (done) => {
            sut.initIdentityManager()
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no managerType')
                done()
            })
        })

        test('no networkName', (done) => {
            sut.initIdentityManager('IdentityManager', null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no networkName')
                done()
            })
        })

        test('invalid managerType', (done) => {
            sut.initIdentityManager('invalidManager', 'rinkeby')
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('invalid managerType')
                done()
            })
        })
    })

    describe('createIdentity', () => {

      test('no deviceKey', (done) => {
        sut.createIdentity({})
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no deviceKey')
              done()
          })
      })

      test('no managerType', (done) => {
        sut.createIdentity({deviceKey: "0x0", blockchain: "rinkeby"})
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no managerType')
              done()
          })
      })

      test('no payload destination', (done) => {
        sut.createIdentity({
          deviceKey: "0x0",
          blockchain: "rinkeby",
          managerType: "IdentityManager",
          payload: {
            foo: "bar"
          }
        })
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('payload but no payload.destination')
              done()
          })
      })

      test('no payload data', (done) => {
        sut.createIdentity({
          deviceKey: "0x0",
          blockchain: "rinkeby",
          managerType: "IdentityManager",
          payload: {
            destination: "0x0"
          }
        })
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('payload but no payload.data')
              done()
          })
      })

    })


})