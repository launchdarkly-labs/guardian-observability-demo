// FOR AWS JAM: add these two lines of LD imports
import { init, LDContext } from '@launchdarkly/node-server-sdk';
import { Observability } from '@launchdarkly/observability-node'

import express from 'express';
import cors from 'cors';


const PORT = process.env.PORT || 3000

// FOR AWS JAM: initialize the LD client
const ldClient = init(process.env.LD_SDK_KEY ?? '', {
    plugins: [new Observability({
        serviceName: 'guarded-rollout-demo',
    }),],
});

const app = express();
app.use(cors());


// how often the old and new API logic will throw an error, as %
const ERROR_RATES = {
    old: 10,
    new: 30
}

// basic API endpoint, using LaunchDarkly to migrate from an old version to a new one
app.get('/:key', async (req, res) => {

    // FOR AWS JAM: create context and get flag variation
    const context: LDContext = {
        "kind": 'user',
        "key": req.params.key
    };
    const serveNewApi = await ldClient.variation('release-new-api', context, false); // get our flag value from the LD SDK

    const rand = Math.random() * 100
    
    // express will automatically send a 500 status with the error details if an unhandled error occurs in a route
    const oldAPI = async () => {
        if (rand < ERROR_RATES.old) {
            throw new Error('OLD API ERROR')
        }
        res.status(200).json({ msg: `OLD` })
    }

    const newAPI = async () => {
        if (rand < ERROR_RATES.new) {
            throw new Error('NEW API ERROR')
        }
        res.status(200).json({ msg: `NEW` })
    }

    // FOR AWS JAM: create conditional to determine which code path to execute based on flag variation
    if (serveNewApi) {
        await newAPI()
    }
    else {
        await oldAPI()
    }
})


// Start the server
app.listen(PORT, function (err) {
    if (err) {
        console.error('Error starting server:', err)
        return
    }
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🔧 Make sure you have set up your LD_SDK_KEY in .env`)
})
