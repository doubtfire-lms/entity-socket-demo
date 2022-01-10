const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const res = require('express/lib/response');
const http = require('http');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000

const WebSocket = require('ws');
const wss = new WebSocket.Server({ server })

wss.on('connection', function(ws){
    ws.send('Hello From Server!')
        ws.on('message',function(message){
            const data = message;
            wss.clients.forEach(function each(client){
            if(client != ws && client.readystate == WebSocket.OPEN){ 
                client.send(data);
            }
        })
    })
})

//Listen on ENV PORT
server.listen(port, () => console.log(`Listening on port ${port}`))

app.use(bodyParser.urlencoded({ extended:false }))

app.use(bodyParser.json())



//MySQL Connection
const pool = mysql.createPool({
    connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password        : 'root',
    database        : 'entityservice'   
});


//Get all Data
app.get('/messages',(req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        connection.query('SELECT * from entities', (err, rows) => {
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
app.get('/messages/:id',(req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
       //console.log(`connected as id ${connection.threadId}`)

        connection.query('SELECT * from entities WHERE id = ?', [req.params.id], (err, rows) => {
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
app.delete('/messages/:id',(req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        connection.query('DELETE from entities WHERE id = ?', [req.params.id], (err, rows) => {
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
app.post('/messages',(req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        
        const params = req.body

        connection.query('INSERT INTO entities SET ?', params, (err, rows) => {
            connection.release()

            if(!err){
                res.send(`Data with the Record Username: ${params.username} has been added.`)
            }
            else{
                console.log(err)
            }
        })
        console.log(req.body)
    })
})

//Update Data
app.put('/messages/:id',(req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
        //console.log(`connected as id ${connection.threadId}`)

        
        const params = req.body
        const {id, username, message} = req.body

        connection.query('UPDATE entities SET username = ?, message = ? WHERE id = ?', [username, message, id], (err, rows) => {
            connection.release()

            if(!err){
                res.send(`Data with the Record Username: ${username} has been Updated.`)
            }
            else{
                console.log(err)
            }
        })
        console.log(req.body)
    })
})

