const express = require('express')
const bodyParser = require('body-parser')
const ngrok = require('ngrok')

const { recoverPersonalSignature } = require('eth-sig-util');
const { bufferToHex } = require('ethereumjs-util');

var cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();

let endpoint = ''
const app = express();
app.use(bodyParser.json({ type: '*/*' }))
app.use(cors({
  origin: '*',
}))

//--------------------------------------------------------------------------------------------------------------
const userRouter = express.Router();

userRouter
  .route('/')
  .get ((req, res) => {
    console.log(req.query)
    const userId = req.query.publicAddress;  
  
    user ={'email':'alecsgarza','nonce':'this should be random', 'publicAddress': userId};
    res.json(user)
  })

app.use('/users', userRouter);

//--------------------------------------------------------------------------------------------------------------
const authRouter = express.Router();
const config = {
  'secret': 'shhh',
};

const create = (req, res, next) => {
  const { signature, publicAddress } = req.body;
  if (!signature || !publicAddress)
    return res
      .status(400)
      .send({ error: 'Request should have signature and publicAddress' });

  return ( new Promise( (resolve, reject) => {

      user ={'email':'alecsgarza','nonce':'this should be random', 'publicAddress': publicAddress};
      const msg = `I am signing my one-time nonce: ${user.nonce}`;

      console.log(user, msg)
      // We now are in possession of msg, publicAddress and signature. We
      // will use a helper from eth-sig-util to extract the address from the signature
      const msgBufferHex = bufferToHex(Buffer.from(msg, 'utf8'));
      const address = recoverPersonalSignature({
        data: msgBufferHex,
        sig: signature,
      });

      console.log('address', address)
      // The signature verification is successful if the address found with
      // sigUtil.recoverPersonalSignature matches the initial publicAddress
      if (address.toLowerCase() === publicAddress.toLowerCase()) {
        console.log('same address')
        resolve(user);
      } else {
        res.status(401).send({ error: 'Signature verification failed' });
        reject({'err':'Signature verification failed'});
      }
    })
    /* .then((user) => {
      Set new nonce
      return user
    }) */
    .then((user) => {
      console.log('jwt', user)
      return new Promise((resolve, reject) =>
        // https://github.com/auth0/node-jsonwebtoken
        jwt.sign(
          {
            payload: {
              email: user.email,
              publicAddress,
            },
          },
          config.secret,
          {},
          (err, token) => {
            if (err) {
              return reject(err);
            }
            return resolve(token);
          }
        )
      );
    })
    .then((accessToken) => res.json({ accessToken }))
  );
};

/** POST /api/auth */
authRouter.route('/').post(create);
app.use('/auth', authRouter);

// run the app server and tunneling service
const server = app.listen(8088, () => {
  ngrok.connect(8088).then(ngrokUrl => {
    endpoint = ngrokUrl
    console.log(`Login Service running, open at ${endpoint}`)
  })
})