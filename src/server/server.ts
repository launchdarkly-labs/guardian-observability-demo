import { init, LDContext, LDOptions } from '@launchdarkly/node-server-sdk';
import { Observability, LDObserve } from '@launchdarkly/observability-node'
import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 3000

// Initialize LaunchDarkly client with your project's SDK key
// This connects your application to LaunchDarkly's service
const ldClient = init(process.env.LD_SDK_KEY ?? '', {
    plugins: [new Observability({
        serviceName: 'guarded-rollout-demo',
    }),],
});

const app = express();
app.use(cors());

// setting up a user context, we'll need to fill in the key as a unique identifier later
const context: LDContext = {
    "kind": 'user',
    "key": ''
};

// how often the old and new API logic will throw an error, as %
const ERROR_RATES = {
    old: 50,
    new: 30
}

app.get('/what', (req, res) => {
    console.log('whatwhat')
    if (Math.random() > 0.5) {
        console.log('crashing')
        throw new Error('error, what error?')
    }
    res.sendStatus(200)
})

// basic API endpoint, using LaunchDarkly to migrate from an old version to a new one
app.get('/echo/:key', async (req, res) => {
    const { key } = req.params
    context.key = key
    const serveNewApi = await ldClient.variation('clone-echo', context, false); // get our flag value from the LD SDK
    const rand = Math.random() * 100

    // Old version logic, generates error event based on ERROR_RATES.old
    const oldAPI = async () => {
        if (rand < ERROR_RATES.old) {
            throw new Error('Old API Error')
        }
        res.status(200).json({ msg: `OLD` })
    }

    // New version logic, generates error event based on ERROR_RATES.new
    const newAPI = async () => {
        if (rand < ERROR_RATES.new) {
            throw new Error('New API Error')
        }
        res.status(200).json({ msg: `NEW` })
    }

    // Use our flag to determine which code path to execute
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
