const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config()


// Using destructuring to get Schema.
const {Schema} = mongoose;

// Our Schemas and models.
let userLogSchema;
let exerciseLogSchema;
let userLogsModel;

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extetended: true}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Handling the new user requests.
app.post('/api/exercise/new-user', (req, res) => {
  const username = req.body['username'];

  checkIfUserExists(username).then((userlog) => {
    
    
    return res.json({      
      username: username,
      _id: userlog['_id']
    });
  }).catch((err) => {
    userLogsModel.create({
    username: username
    }).then((data) => {
      return res.json({username: data['username'], _id: data['_id']});
    }).catch((err) => {
      console.log(err);
      console.log('Error in creating user');
    });
  });
});



// Handling the new exerciselog requests.
app.post('/api/exercise/add', (req, res) => {
  const userId = req.body['userId'];
  const description = req.body['description'];
  const duration = req.body['duration'];
  let date;

  if(req.body['date']){
    date = new Date(req.body['date']).toDateString();
  }else{
    const todayDate = new Date();
    date = todayDate.toDateString();
  }

  userLogsModel.findOne({_id: userId}).then((userLog) => {
    console.log(userLog);
    if(userLog){
      const userExerciseArray = userLog.exercises;
      userExerciseArray.push({
        description: description,
        duration: duration,
        date: date
      });
      userLog.save().then((data) => {
        res.json({_id: data['_id'],
          username: data['username'],
          date: date,
          description: description,
          duration: parseInt(duration)
        });
      });
    }else{
      res.json({error: 'User not found'});
    }
  }).catch((err) => {
    console.log('Error in finding user');
  })

});


// Getting the array of users.
app.get('/api/exercise/users', (req, res) => {
  queryAllUsers().then((data) => {
    const userData = [];

    for(let {_id, username} of data){
      userData.push({_id, username});
    }

    res.json(userData);

  }).catch((err) => {
    console.log(err);
  })
});

app.get('/api/exercise/log', (req, res) => {
  const userId = req.query.userId;
  const limit = parseInt(req.query.limit);
  const fromDate = new Date(req.query.from);
  const toDate = new Date(req.query.to);




  let ourQuery = userLogsModel.findOne({_id: userId});  
  ourQuery.exec().then((data) => {
    
    const exercises = data['exercises'];
    

    const responseExerciseArray = [];

    const doNotCheckDate = toDate.toDateString() === 'Invalid Date';

    for(exercise of exercises){
      const currentExerciseDate = new Date(exercise.date);
      // console.log(currentExerciseDate.toDateString());
      
      if(limit && responseExerciseArray.length >= limit){
        break;
      }
      
      if(doNotCheckDate){
        const objectToPush = {
          description: exercise['description'],
          duration: exercise['duration'],
          date: exercise['date']
        }
        responseExerciseArray.push(objectToPush);
      }else
      if(currentExerciseDate >= fromDate && currentExerciseDate <= toDate){
        const objectToPush = {
          description: exercise['description'],
          duration: exercise['duration'],
          date: exercise['date']
        }

        responseExerciseArray.push(objectToPush);
      }
    }
    
    const objectToRespond = {
      _id: data['_id'],
      username: data['username'],
      count: responseExerciseArray.length,
      log: responseExerciseArray
    }

    res.json(objectToRespond);
  }).catch((err) => {
    console.log(err);
  });

});



// Connecting to the database
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {

  createSchemaAndModel();

  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
  });

}).catch((err) => {
  console.log('Error');
  console.log(err);
});


// Create Schema and Model.
function createSchemaAndModel(){

  // Creating the Schemas.
  exerciseLogSchema = new Schema({
    description: String,
    duration: Number,
    date: String
  });

  userLogSchema = new Schema({
    username: String,
    exercises: [exerciseLogSchema]
  });

  // Creating a model based on the Schemas.
  userLogsModel = mongoose.model('userLogs', userLogSchema);
}

// Checking by username if a user exists.
function checkIfUserExists(username){
  return new Promise((resolve, reject) => {
    userLogsModel.findOne({
    username: username
    }).exec().then((data) => {
      if(data){                
        resolve(data);
      }
      reject('User not found');
    }).catch((err) => {
      reject(err);
    });
  });
}

// Retrieving all the user data.
function queryAllUsers(){
  return new Promise((resolve, reject) => {
    userLogsModel.find({}).then((data) => {
    resolve(data);
    }).catch((err) => {
      reject(err);
    });
  });
}
