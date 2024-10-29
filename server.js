const express=require("express")
const app=express()
const https = require("https")
const fs = require("fs")
const socketio = require("socket.io")

const key = fs.readFileSync("cert.key")
const cert = fs.readFileSync("cert.crt")

app.use(express.static(__dirname))

const expressServer=https.createServer({key,cert}, app)

expressServer.listen(8181)
//
const io = socketio(expressServer,{cors:{
    origin:["https://localhost",
        "https://192.168.100.209"],method:["GET","POST"]
}})

const connectedSockets=[];
const offers=[]


io.on("connect",socket=>{

   const username=socket.handshake.auth.username;
   const pass=socket.handshake.auth.password;

   connectedSockets.push({'username':username,'id':socket.id})
    
    console.log("New socket connection stablish: ",socket.id)

    if(offers.length){
        io.emit('availableOffers',offers)
    }
    
    socket.on("offer",offer=>{
        const offerObj={
            'offerUsername':username,
            'offer':offer,
            'offerIcecandidates':null,
            'answerUsername':null,
            'answer':null,
            'answerIcecandidates':null
        }
       // console.log(offerObj)

        offers.push(offerObj)
       // console.log("New offer received")
        io.emit('newOffer',offerObj)
        console.log('Offer emitted')
    })
    
    socket.on('new-candidate',cObj=>{
        if(cObj.isOffer){
            // candidate from offer - prepare to send to answer
            // append candidates 
            const offerToUpdate=offers.find(offer=>offer.offerUsername == cObj.username)
            if(offerToUpdate){
                offerToUpdate.offerIcecandidates=cObj.candidate;
                //console.log("showing, offer:",offerToUpdate.offerIcecandidates)
               // console.log("Showing Offer Object Updated:\n",offerToUpdate)
                console.log(`Object offer correctly updated`)
            }else{
                console.log(`Any offer with username ${candidate.username} was founded`)
            }
        }else{
            // candidates from answer
            // Update ObjectBuffer
           //console.log("Showing candidate obj coming from ASNWER\n",cObj)
            let offerToUpdate=offers.find(offer=>offer.offerUsername == cObj.offerObj.offerUsername)
          // console.log('Showing offer to update:',offerToUpdate)
           
            offerToUpdate.answerUsername=cObj.username;
            offerToUpdate.answerIcecandidates=cObj.candidate
           console.log('Showing current state of offerObj\n:',offerToUpdate)
            //console.log("Showing Obj to Update in ice-asnwer CTX:\n",offerToUpdate)
            // find the socket and send candidates
            const socketObj=connectedSockets.find(s=>s.username == offerToUpdate.offerUsername)
            if(socketObj){
                socket.to(socketObj.id).emit('candidateFromAnswer',cObj.candidate)
            }else{
                console.log(`Any offer ${s.username} was foind it`)
            }
        }
    })

    socket.on("new-answer",(offerObj,ackFunction)=>{
        //console.log("Showing updated obj byy answer",offerObj)
        // find oferObj
        const objOffertoUpdate=offers.find(offer=>offer.offerUsername== offerObj.offerUsername)
        // get candidate
        const candidate=objOffertoUpdate.offerIcecandidates
        console.log('showing current candidates:\n',candidate)
        // retrieve candidates
        ackFunction(candidate)
        // retrieve offerObj update with answer
        objOffertoUpdate.answer=offerObj.answer
        const socket = connectedSockets.find(s=>s.username == objOffertoUpdate.offerUsername)
    
        io.to(socket.id).emit('answer',objOffertoUpdate.answer)
        
    })
})

