jest.mock('pg')
jest.mock('truffle-contract')

import Contract from 'truffle-contract'
import { Client } from 'pg'

let pgClientMock={
    connect:jest.fn(),
    end:jest.fn()
}
let contractMock={
    setProvider: jest.fn(),
    deployed:jest.fn()
}

Contract.mockImplementation(()=>{return contractMock});
Client.mockImplementation(()=>{return pgClientMock});

const IdentityManagerMgr = require('../identityManagerMgr')

describe('IdentityManagerMgr', () => {

    let sut;
    let mockEthereumMgr={
        getProvider: jest.fn(),
        getNetworkId: jest.fn(),
        getAddress: jest.fn(),
        getGasPrice: jest.fn(),
        getNonce: jest.fn(),
    };
    let deviceKey = '0x8f7a1e41018fbb94caa18281e4d6acfc77521672'
    let txHash = '0x6e2fce45a5b97d9c7902f869851824013f6cf00a7c14a30b8158945844d24f21'
    let networkName = 'rinkeby'
    let managerAddress = '0x95f35f87608c3a871838f11cbefa8bd76fdf5686'

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
            sut.initIdentityManager('invalidManager', networkName)
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
        sut.createIdentity({deviceKey: deviceKey, blockchain: networkName})
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
          deviceKey: deviceKey,
          blockchain: networkName,
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
          deviceKey: deviceKey,
          blockchain: networkName,
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

      test.skip('empty recoverykey', (done) => {

        sut.identityManagers =  jest.fn(() => { return Promise.resolve(
          {rinkeby: {address: "0x0"}}
        )})
        sut.initIdentityManager = jest.fn();


        sut.createIdentity({
          deviceKey: deviceKey,
          recoveryKey: "",
          blockchain: networkName,
          managerType: "IdentityManager",
          payload: {
            destination: "0x0",
            data: "dummy"
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

      test('storeIdentityCreation() no deviceKey', (done) => {
        sut.storeIdentityCreation(null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no deviceKey')
              done()
          })
      })

      test('storeIdentityCreation() no txHash', (done) => {
        sut.storeIdentityCreation(deviceKey, null, null, null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no txHash')
              done()
          })
      })

      test('storeIdentityCreation() no networkName', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, null, null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no networkName')
              done()
          })
      })

      test('storeIdentityCreation() no managerAddress', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, networkName, null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no managerAddress')
              done()
          })
      })

      test('storeIdentityCreation() happy path', (done) =>{
        sut.setSecrets({PG_URL: 'fake'})
        pgClientMock.connect=jest.fn()
        pgClientMock.connect.mockClear()
        pgClientMock.end.mockClear()
        pgClientMock.query=jest.fn(()=>{ return Promise.resolve("ok")})
        sut.storeIdentityCreation(deviceKey,txHash,networkName,managerAddress)
        .then((resp)=> {
            expect(pgClientMock.connect).toBeCalled()
            expect(pgClientMock.query).toBeCalled()
            expect(pgClientMock.query).toBeCalledWith(
              "INSERT INTO identities(device_key,tx_hash, network,manager_address)\
              VALUES ($1,$2,$3,$4) ",[ deviceKey, txHash, networkName, managerAddress]);
            expect(pgClientMock.end).toBeCalled()
            expect(resp).toBeUndefined()
            done()
        })
    });

      test('getIdentityCreation() no deviceKey', (done) => {
        sut.getIdentityCreation(null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no deviceKey')
              done()
          })
      })

      test('getIdentityCreation() no networkName', (done) => {
        sut.getIdentityCreation(deviceKey, null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no networkName')
              done()
          })
      })

      test('getIdentityCreation() happy path', (done) =>{
        sut.setSecrets({PG_URL: 'fake'})
        pgClientMock.connect=jest.fn()
        pgClientMock.connect.mockClear()
        pgClientMock.end.mockClear()
        pgClientMock.query=jest.fn(()=>{ return Promise.resolve( {rows:["ok"]} )})
        sut.getIdentityCreation(deviceKey,networkName)
        .then((resp)=> {
            expect(pgClientMock.connect).toBeCalled()
            expect(pgClientMock.query).toBeCalled()
            expect(pgClientMock.query).toBeCalledWith(
            "SELECT tx_hash, manager_address, identity \
               FROM identities \
              WHERE device_key = $1 \
                AND network = $2 \
           ORDER BY created \
              LIMIT 1"
              , [deviceKey, networkName]);
            expect(pgClientMock.end).toBeCalled()
            expect(resp).toEqual("ok")
            done()
        })
    });

    })


})