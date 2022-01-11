const express = require('express');
const bodyParser = require('body-parser');
const res = require('express/lib/response');
const http = require('http');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server })

const config = require('./Configuration/config');

//No Need of Connecting WS

//wss.on('connection', function(ws){
//    ws.send('Hello From Server!')
//        ws.on('message',function(message){
//            const data = message;
//            console.log(JSON.stringify(data))
//    })
//})

//Listen on ENV PORT
server.listen(port, () => console.log(`Listening on port ${port}`))

app.use(bodyParser.urlencoded({ extended:false }))

app.use(bodyParser.json())

//Allow allow origin header node js
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


//Get all Data
app.get('/api/messages',(req, res) => {
    config.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        connection.query('SELECT * from messages', (err, rows) => {
            connection.release()

            if(!err){
                res.send(rows)
            }
            else{
                console.log(err)
            }
        })
    })
})

//Get Data by id
app.get('/api/messages/:id',(req, res) => {
    config.getConnection((err, connection) => {
        if(err) throw err
       //console.log(`connected as id ${connection.threadId}`)

        connection.query('SELECT * from messages WHERE id = ?', [req.params.id], (err, rows) => {
            connection.release()

            if(!err){
                res.send(rows)
            }
            else{
                console.log(err)
            }
        })
    })
})

//Delete Data
app.delete('/api/messages/:id',(req, res) => {
    config.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        connection.query('DELETE from messages WHERE id = ?', [req.params.id], (err, rows) => {
            connection.release()

            if(!err){
                res.send(`Data with the Record ID: ${[req.params.id]} has been deleted`)
            }
            else{
                console.log(err)
            }
        })
    })
})

//Add Data
app.post('/api/messages',(req, res) => {
    config.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        
        const params = req.body

        connection.query('INSERT INTO messages SET ?', params, (err, rows) => {
            connection.release()

            if(!err){
                res.send(`Data with the Record Username: ${params.content} has been added.`)
            }
            else{
                console.log(err)
            }
        })
        console.log(req.body)
    })
})

//Update Data
app.put('/api/messages/:id',(req, res) => {
    config.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        
        const params = req.body
        const {id, username, message} = req.body

        connection.query('UPDATE entities SET content = ?', [content], (err, rows) => {
            connection.release()

            if(!err){
                res.send(`Data with the Record Username: ${content} has been Updated.`)
            }
            else{
                console.log(err)
            }
        })
        console.log(req.body)
    })
})

