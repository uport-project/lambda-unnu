const SlackMgr = require('../slackMgr')

describe('SlackMgr', () => {

    let sut;

    beforeAll(() => {
        sut = new SlackMgr();
    });

    test('empty constructor', () => {
        expect(sut).not.toBeUndefined();
        expect(sut.slackObj).toBeNull();

    });

    test('is isSecretsSet', () => {
        let secretSet=sut.isSecretsSet()
        expect(secretSet).toEqual(false);
    });

    test('sendMessage() no slackObj set', (done) =>{
        sut.sendMessage('fakemsg')
        .then((resp)=> {
            fail("shouldn't return"); done()
        })
        .catch( (err)=>{
            expect(err).toEqual('slackObj not set')
            done()
        })
    });

    test('setSecrets', () => {
        expect(sut.isSecretsSet()).toEqual(false);
        sut.setSecrets({SLACK_URL: 'https://hooks.slack.com/',SLACK_CHANNEL: '#slackChannel'})
        expect(sut.isSecretsSet()).toEqual(true);
        expect(sut.slackObj).not.toBeUndefined()
    });

    describe('sendMessage()', ()=>{

        test('no slackMsg', (done) =>{
            sut.sendMessage({})
            .then((resp)=> {
                fail("shouldn't return"); done()
            })
            .catch( (err)=>{
                expect(err).toEqual('no slackMsg')
                done()
            })
        })



    })

})