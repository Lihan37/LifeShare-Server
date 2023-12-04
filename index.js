const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// middleware
const verifyToken = (req, res, next) => {
  console.log('inside verified token', req.headers.authorization);

  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'unauthorized access' });
  }

  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'forbidden access' });
    }
    req.decoded = decoded;
    next();
  })

}

// verify admin
// middleware
const verifyAdmin = async (req, res, next) => {

  if (req.path === '/blogs' && req.method === 'POST') {

    return next();
  }

  const email = req.decoded?.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
};



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
const usersCollection = client.db("lifeDb").collection("users");
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const requestsCollection = client.db("lifeDb").collection("donationRequests");
    const blogsCollection = client.db("lifeDb").collection("blogs");


    // Add the following inside your run() function

    // blogs related api

    app.post('/blogs', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const { title, thumbnail, content } = req.body;

        const newBlog = {
          title,
          thumbnail,
          content,
          status: 'draft', // Default status is draft
        };

        const result = await blogsCollection.insertOne(newBlog);

        res.status(201).json({ success: true, message: 'Blog created successfully', blogId: result.insertedId });
      } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });


    app.get('/blogs', async (req, res) => {
      try {
        const blogs = await blogsCollection.find().toArray();
        console.log('Blogs:', blogs); // Log the retrieved data
        res.status(200).json(blogs);
      } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Add the following inside your run() function

    app.put('/blogs/:id/publish', verifyToken, verifyAdmin, async (req, res) => {
      const blogId = req.params.id;

      try {
        const result = await blogsCollection.updateOne({ _id: new ObjectId(blogId) }, { $set: { status: 'published' } });

        res.json({ updatedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error publishing blog:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    app.put('/blogs/:id/unpublish', verifyToken, verifyAdmin, async (req, res) => {
      const blogId = req.params.id;

      try {
        const result = await blogsCollection.updateOne({ _id: new ObjectId(blogId) }, { $set: { status: 'draft' } });

        res.json({ updatedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error unpublishing blog:', error);
        res.status(500).send('Internal Server Error');
      }
    });


    app.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
      const blogId = req.params.id;

      try {
        const result = await blogsCollection.deleteOne({ _id: new ObjectId(blogId) });

        res.json({ deletedCount: result.deletedCount });
      } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).send('Internal Server Error');
      }
    });



    // jwt api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })




    // donation related api

    app.get('/donationRequests', async (req, res) => {
      try {
        const userEmail = req.query.userEmail;


        const query = userEmail ? { requesterEmail: userEmail } : {};


        const result = await requestsCollection.find(query).toArray();

        console.log('Donation requests:', result);
        res.send(result);
      } catch (error) {
        console.error('Error fetching donation requests:', error);
        res.status(500).send('Internal Server Error');
      }
    });





    app.delete('/donationRequests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestsCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/donationRequests/:id/status', async (req, res) => {
      try {
        const id = req.params.id;
        const { newStatus } = req.body;

        const query = { _id: new ObjectId(id) };
        const update = { $set: { donationStatus: newStatus } };

        const result = await requestsCollection.updateOne(query, update);

        res.send({ updatedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating donation status:', error);
        res.status(500).send('Internal Server Error');
      }
    });



    app.patch('/donationRequests/:id', async (req, res) => {
      try {
        const id = req.params.id;
        console.log('Received ID:', id);

        const updatedData = req.body;
        console.log('Updated Data:', updatedData);

        const result = await requestsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
        console.log('Update Result:', result);

        res.json({ updatedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating donation request:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });

    const { ObjectId } = require('mongodb');



    app.get('/donationRequests/:id', async (req, res) => {
      try {
        const id = req.params.id;

        const donationRequest = await requestsCollection.findOne({ _id: new ObjectId(id) });

        if (!donationRequest) {
          res.status(404).json({ error: 'Donation request not found' });
          return;
        }

        res.json(donationRequest);
      } catch (error) {
        console.error('Error fetching donation details:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });





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

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })

      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';

      }
      res.send({ admin });
    })
    app.get('/users/volunteer/:email', verifyToken, async (req, res) => {
      const email = req.params.email;


      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden access' });
      }


      const query = { email: email };
      const user = await usersCollection.findOne(query);

      let volunteer = false;


      if (user) {
        volunteer = user?.role === 'volunteer';
      }


      res.send({ volunteer });
    });


    app.get('/users/:email', verifyToken, async (req, res) => {
      const userEmail = req.params.email;

      try {
        const user = await usersCollection.findOne({ email: userEmail });

        if (user) {
          console.log('User Data from Database:', user);

          res.send({
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bloodGroup: user.bloodGroup,
            district: user.district,
            upazila: user.upazila,

          });
        } else {
          console.log('User not found');
          res.status(404).send({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });






    app.post('/users', async (req, res) => {
      try {
        const {
          name,
          email,
          avatar,
          bloodGroup,
          district,
          upazila,
          password,
        } = req.body;

        // Check if the user already exists
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }

        // Create a new user object
        const user = {
          name: req.body.name,
          email: req.body.email,
          avatar: req.body.avatar, // Make sure this field is correct
          bloodGroup: req.body.bloodGroup,
          district: req.body.district,
          upazila: req.body.upazila,
          // Include other fields as needed
          status: 'active',
        };

        // Insert the user into the database
        const result = await usersCollection.insertOne(user);

        if (result.insertedId) {
          console.log('User added successfully');
          res.send({ message: 'User added successfully', insertedId: result.insertedId });
        } else {
          console.log('Failed to add user');
          res.status(500).send({ message: 'Failed to add user', insertedId: null });
        }
      } catch (error) {
        console.error('Error in registration route:', error);
        res.status(500).send({ message: 'Internal server error', insertedId: null });
      }
    });

    app.patch('/users/admin/block/:id', verifyToken, verifyAdmin, async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: new ObjectId(userId) };
      const update = { $set: { status: 'blocked' } };

      try {
        const result = await usersCollection.updateOne(filter, update);

        if (result.modifiedCount > 0) {
          console.log('User blocked successfully');
          res.send({ message: 'User blocked successfully' });
        } else {
          console.log('User not found');
          res.status(404).send({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });

    app.patch('/users/admin/unblock/:id', verifyToken, verifyAdmin, async (req, res) => {
      const userId = req.params.id;
      const filter = { _id: new ObjectId(userId) };
      const update = { $set: { status: 'active' } };
      try {
        const result = await usersCollection.updateOne(filter, update);

        if (result.modifiedCount > 0) {
          res.send({ message: 'User unblocked successfully' });
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });


    app.patch('/users/volunteer/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'volunteer'
        }
      };

      try {
        const result = await usersCollection.updateOne(filter, updatedDoc);

        if (result.modifiedCount > 0) {
          const user = await usersCollection.findOne(filter);
          res.send({ message: 'User is now a Volunteer', role: user.role });
        } else {
          res.status(404).send({ message: 'User not found' });
        }
      } catch (error) {
        console.error('Error making user a volunteer:', error);
        res.status(500).send({ message: 'Internal server error' });
      }
    });





    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
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