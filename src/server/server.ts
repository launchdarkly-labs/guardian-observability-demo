import dotenv from 'dotenv';
import { init, LDContext, LDOptions } from '@launchdarkly/node-server-sdk';
import { Observability, LDObserve } from '@launchdarkly/observability-node'
import express from 'express';
import cors from 'cors';

dotenv.config();
const PORT = process.env.PORT || 3000

// Initialize LaunchDarkly client with your project's SDK key
// This connects your application to LaunchDarkly's service
const ldClient = init(process.env.LD_SDK_KEY ?? '', {
    plugins: [ new Observability({
        serviceName: 'guarded-rollout-demo',
    }), ],
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
    old: 5,
    new: 30
}

app.get('/what', async (req, res) => {
    console.log('whatwhat')
    res.sendStatus(200)
})

app.get('/run-span-example', async (req, res) => {
	await LDObserve.runWithHeaders('example-span-b', req.headers, (span) => {
		LDObserve.setAttributes({
			'example-attribute': 'example-value',
		})

		res.sendStatus(500)
	})
})

app.get('/start-span-example', (req, res) => {
	const { span } = LDObserve.startWithHeaders('example-span-a', req.headers)

	LDObserve.setAttributes({
		'example-attribute': 'example-value',
	})

    console.log('span started')

	res.send('Hello World')
	span.end()
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
            // Let the error bubble up to be caught by the observability plugin
            throw new Error('Old API Error')
        }
        res.status(200).json({ msg: `OLD` })
    }

    // New version logic, generates error event based on ERROR_RATES.new
    const newAPI = async () => {
        if (rand < ERROR_RATES.new) {
            // Let the error bubble up to be caught by the observability plugin
            throw new Error('New API Error')
        }
        res.status(200).json({ msg: `NEW` })
    }
    
    // Use our flag to determine which code path to execute
    try {
        if (serveNewApi) {
            await newAPI()
        }
        else {
            await oldAPI()
        }
    } catch (error) {
        // The observability plugin should automatically track this error
        ldClient.track('global error rate', context);
        res.status(500).json({ 
            msg: serveNewApi ? 'NEW' : 'OLD',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
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
