const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9xsrko.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db("lifeDb").collection("users");
        const requestsCollection = client.db("lifeDb").collection("donationRequests");

        // donation related api

        app.get('/donationRequests', async (req, res) => {
            console.log('inside verify token', req.headers);
            const result = await requestsCollection.find().toArray();
            res.send(result);
        });
        
        app.delete('/donationRequests/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await requestsCollection.deleteOne(query);
            res.send(result);
          })

        app.post('/donationRequests', async (req, res) => {
            try {
              
              const {
                requesterName,
                requesterEmail,
                recipientName,
                recipientDistrict,
                recipientUpazila,
                hospitalName,
                fullAddress,
                donationDate,
                donationTime,
                requestMessage,
                donationStatus,
              } = req.body;
        
              
              const newDonationRequest = {
                requesterName,
                requesterEmail,
                recipientName,
                recipientDistrict,
                recipientUpazila,
                hospitalName,
                fullAddress,
                donationDate,
                donationTime,
                requestMessage,
                donationStatus,
              };
        
              
              await requestsCollection.insertOne(newDonationRequest);
        
              res.json({ success: true, message: 'Donation request created successfully' });
            } catch (error) {
              console.error('Error creating donation request:', error);
              res.status(500).json({ success: false, error: 'Internal server error' });
            }
          });


        //user related api

        app.get('/users', async (req, res) => {
            console.log('inside verify token', req.headers);
            const result = await usersCollection.find().toArray();
            res.send(result);
        });


        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              role: 'admin'
            }
          }
          const result = await usersCollection.updateOne(filter, updatedDoc);
          res.send(result);
    
        })

        app.delete('/users/:id', async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await usersCollection.deleteOne(query);
          res.send(result);
        })
          


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('LifeShare is here')
})

app.listen(port, () => {
    console.log(`LifeShare is running on port ${port}`);
})