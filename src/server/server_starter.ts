import express from 'express';
import cors from 'cors';


const PORT = process.env.PORT || 3000

const app = express();
app.use(cors());

// how often the old and new API logic will throw an error, as %
const ERROR_RATES = {
    old: 10,
    new: 30
}

// basic API endpoint, using LaunchDarkly to migrate from an old version to a new one
app.get('/:key', async (req, res) => {

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

    oldAPI()
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
