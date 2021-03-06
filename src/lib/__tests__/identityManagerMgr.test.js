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
    let txReceiptMock = {
      "transactionHash": "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
      "transactionIndex": 0,
      "blockHash": "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
      "blockNumber": 3,
      "contractAddress": "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe",
      "cumulativeGasUsed": 314159,
      "gasUsed": 30234,
      "logs": []
    };
    let mockEthereumMgr={
        getProvider: jest.fn(),
        getNetworkId: jest.fn(),
        getAddress: jest.fn(),
        getGasPrice: jest.fn(),
        getNonce: jest.fn(),
        getTransactionReceipt: jest.fn(),
    };
    let deviceKey = '0x8f7a1e41018fbb94caa18281e4d6acfc77521672'
    let txHash = '0x6e2fce45a5b97d9c7902f869851824013f6cf00a7c14a30b8158945844d24f21'
    let networkName = 'rinkeby'
    let managerAddress = '0x95f35f87608c3a871838f11cbefa8bd76fdf5686'
    let managerType = 'IdentityManager'
    let txOptions = {
        from: '0xfakeFromAddress',
        gas: 400000,
        gasPrice: 10,
        nonce: 1
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

      test('invalid managerType', (done) => {

        sut.createIdentity({
          deviceKey: deviceKey,
          recoveryKey: "",
          blockchain: networkName,
          managerType: "InvalidIdentityManager",
          payload: {
            destination: "0x0",
            data: "dummy"
          }
        })
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('invalid managerType')
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
          recoveryKey: deviceKey,
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

    });

    describe('storeIdentityCreation', () => {
    
      test('no deviceKey', (done) => {
        sut.storeIdentityCreation(null,null,null,null,null,null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no deviceKey')
              done()
          })
      })

      test('no txHash', (done) => {
        sut.storeIdentityCreation(deviceKey, null, null, null,null,null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no txHash')
              done()
          })
      })

      test('no networkName', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, null, null,null, null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no networkName')
              done()
          })
      })

      test('no managerType', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, networkName, null,null,null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no managerType')
              done()
          })
      })

      test('no managerAddress', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, networkName, managerType,null,null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no managerAddress')
              done()
          })
      })

      test('no txOptions', (done) => {
        sut.storeIdentityCreation(deviceKey, txHash, networkName, managerType,managerAddress,null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no txOptions')
              done()
          })
      })

      test('no pgUrl', (done) => {
        if (sut.isSecretsSet()){
          sut.setSecrets({PG_URL: null})
        }
        sut.storeIdentityCreation(deviceKey, txHash, networkName, managerType, managerAddress, txOptions)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no pgUrl set')
              done()
          })
      })

      test('happy path', (done) =>{
        sut.setSecrets({PG_URL: 'fake'})
        pgClientMock.connect=jest.fn()
        pgClientMock.connect.mockClear()
        pgClientMock.end.mockClear()
        pgClientMock.query=jest.fn(()=>{ return Promise.resolve("ok")})
        sut.storeIdentityCreation(deviceKey,txHash,networkName,managerType,managerAddress,txOptions)
        .then((resp)=> {
            expect(pgClientMock.connect).toBeCalled()
            expect(pgClientMock.query).toBeCalled()
            expect(pgClientMock.query).toBeCalledWith(
              "INSERT INTO identities(device_key,tx_hash, network,manager_type,manager_address,tx_options)\
              VALUES ($1,$2,$3,$4,$5,$6) ",[ deviceKey, txHash, networkName, managerType, managerAddress,txOptions]);
            expect(pgClientMock.end).toBeCalled()
            expect(resp).toBeUndefined()
            done()
        })
      });

    });

    describe("getIdentityCreation", () => {

      test('no deviceKey', (done) => {
        sut.getIdentityCreation(null)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no deviceKey')
              done()
          })
      })

      test('no pgUrl', (done) => {
        if (sut.isSecretsSet()){
          sut.setSecrets({PG_URL: null})
        }
        sut.getIdentityCreation(deviceKey, networkName)
          .then((resp)=> {
              fail("shouldn't return"); done()
          })
          .catch( (err)=>{
              expect(err).toEqual('no pgUrl set')
              done()
          })
      })

      test('happy path', (done) =>{
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
            "SELECT tx_hash, manager_type, manager_address, identity, network \
               FROM identities \
              WHERE device_key = $1 \
           ORDER BY created \
              LIMIT 1"
              , [deviceKey]);
            expect(pgClientMock.end).toBeCalled()
            expect(resp).toEqual("ok")
            done()
        })
      });
    
    });
    
    describe("getIdentityFromTxHash", () => {

        test('no txHash', (done) => {
            sut.getIdentityFromTxHash(null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no txHash')
                done()
            })
        })

        test('no blockchain', (done) => {
            sut.getIdentityFromTxHash(txHash, null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no blockchain')
                done()
            })
        })

        test('no pgUrl', (done) => {
            if (sut.isSecretsSet()){
                sut.setSecrets({PG_URL: null})
            }
            sut.getIdentityFromTxHash(txHash, networkName)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no pgUrl set')
                done()
            })
        })

        test('no txReceipt', (done) => {
            sut.setSecrets({PG_URL: 'fake'})
            mockEthereumMgr.getTransactionReceipt=jest.fn(() => { return Promise.resolve(null)})
            mockEthereumMgr.getTransactionReceipt.mockClear()
            sut.getIdentityFromTxHash(txHash, networkName)
            .then((resp)=> {
                expect(mockEthereumMgr.getTransactionReceipt).toBeCalled()
                expect(resp).toBeNull()
                done();
            })
        })

        test('happy path', (done) => {
            sut.setSecrets({PG_URL: 'fake'})
            sut.decodeLogs =  jest.fn(() => { return Promise.resolve(
                {identity: deviceKey}
            )})

            mockEthereumMgr.getTransactionReceipt=jest.fn(() => { return Promise.resolve(txReceiptMock) })
            mockEthereumMgr.getTransactionReceipt.mockClear()
            pgClientMock.connect=jest.fn()
            pgClientMock.connect.mockClear()
            pgClientMock.end.mockClear()
            pgClientMock.query=jest.fn(()=>{ return Promise.resolve( {rows:["ok"]} )})
            sut.getIdentityFromTxHash(txHash,networkName)
            .then((resp)=> {
                expect(mockEthereumMgr.getTransactionReceipt).toBeCalled()
                expect(pgClientMock.connect).toBeCalled()
                expect(pgClientMock.query).toBeCalled()
                expect(pgClientMock.query).toBeCalledWith(
                    "UPDATE identities \
                SET identity = $2, \
                    tx_receipt = $3, \
                    updated = now() \
              WHERE tx_hash = $1"
                    , [txHash, deviceKey,txReceiptMock]);
                expect(pgClientMock.end).toBeCalled()
                expect(resp).toEqual(deviceKey)
                done()
            })
        })
    });

    describe("getPendingTx", () => {

        test('no blockchain', (done) => {
            sut.getPendingTx(null, null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no blockchain')
                done()
            })
        })

        test('no age', (done) => {
            sut.getPendingTx(networkName, null)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no age')
                done()
            })
        })


        test('no pgUrl', (done) => {
            if (sut.isSecretsSet()){
                sut.setSecrets({PG_URL: null})
            }
            sut.getPendingTx(networkName,60)
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no pgUrl set')
                done()
            })
        })

        test('happy path', (done) => {
            sut.setSecrets({PG_URL: 'fake'})
            pgClientMock.connect=jest.fn()
            pgClientMock.connect.mockClear()
            pgClientMock.end.mockClear()
            pgClientMock.query=jest.fn(()=>{ return Promise.resolve( {rows:["ok"]} )})
            sut.getPendingTx(networkName,60)
            .then((resp)=> {
                expect(pgClientMock.connect).toBeCalled()
                expect(pgClientMock.query).toBeCalled()
                /*
                expect(pgClientMock.query).toBeCalledWith(
                    "SELECT tx_hash \
                     FROM identities \
                    WHERE tx_receipt is NULL \
                      AND network = $1 \
                      AND created > now() - CAST ($2 AS INTERVAL)",
                [networkName, '60 seconds']);
                */
                expect(pgClientMock.end).toBeCalled()
                expect(resp).toEqual({rows:["ok"]});
                done()
            })
        })

    });
})