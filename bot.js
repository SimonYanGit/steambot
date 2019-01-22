const SteamUser = require ('steam-user');
const SteamTotp = require ('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const Prices = require('./prices.json');
const config = require('./config.json');
const client = new SteamUser();

const community = new SteamCommunity();
const manager = new TradeOfferManager({
	steam: client,
	community: community,
	language: 'en'
});

const logOnOptions = {
	accountName: config.username,
	password: config.password,
	twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
};

client.logOn(logOnOptions);
client.on('loggedOn', () => {
	console.log('Logged On!');
	client.setPersona(SteamUser.Steam.EPersonaState.Busy);
	client.gamesPlayed([440]);

});

client.on('webSession', (sessionid, cookies)=>{
	manager.setCookies(cookies);

	community.setCookies(cookies);
	community.startConfirmationChecker(20000, config.identitySecret);
});

function acceptOffer(offer){
	offer.accept((err)=>{
		community.checkConfirmations();
		if (err) console.log("There was an error accepting the offer.");
	});
}

function declineOffer(offer){
	offer.decline((err)=>{
		if (err) console.log("There was an error declining the offer.");
	});
}

function processOffer(offer) {
    if (offer.isGlitched() || offer.state === 11) {
        console.log("Offer was glitched, declining.");
        declineOffer(offer);
    } 
    else {
        var ourItems = offer.itemsToGive;
        var theirItems = offer.itemsToReceive;
        var ourValue = 0;
        var theirValue = 0;
        for (var i in ourItems) {
            var item = ourItems[i].market_name;
            if(Prices[item]) {
                ourValue += Prices[item].sell;
            } else {
                console.log("Invalid Value.");
                ourValue += 99999;
            }
        }
        for(var i in theirItems) {
            var item= theirItems[i].market_name;
            if(Prices[item]) {
                theirValue += Prices[item].buy;
            } else {
            console.log("Their value was different.")
            }
        }
    }
    console.log("O "+ourValue);
    console.log("T "+theirValue);
 
    if (ourValue <= theirValue) {
        acceptOffer(offer);
    } else {
        declineOffer(offer);
    }
}

client.setOption("promptSteamGuardCode", false);

manager.on('newOffer', (offer)=> {
	processOffer(offer);
});
