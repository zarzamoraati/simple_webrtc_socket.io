const configuration={
    iceServers:[{"urls":"stun:stun.l.google.com:19302"}]
}


const userName=`john-${Math.round(Math.random()*10000000000,10)}`
const password='x'

const socket=io.connect("https://192.168.100.209:8181",{
    auth:{
        username:userName,
        password:password
    }
})

const localVideo=document.getElementById("local-video")
let localStream;
const remoteVideo=document.getElementById("remote-video")

let remoteStream;
let peerConnection;


const fetchUserMedia=async()=>{
    try{
        console.log("fetching stream")
        const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
        console.log('stream',stream)
        localStream=stream;
        localVideo.srcObject=stream;
    }catch(err){
        console.log(err)
    }
}
const createPeerConnection=async(offerObj,isOffer)=>{
  try{
    peerConnection = new RTCPeerConnection(configuration)
    //remoteStream = new MediaStream()  
   // remoteVideo.srcObject=remoteStream;  
    localStream.getTracks().forEach(track=> peerConnection.addTrack(track,localStream))
    
    // listening for candidates
    // listening for tracks 

    peerConnection.addEventListener("icecandidate",ev=>{
        console.log("Ev candidate detected")
        if(ev.candidate){
            
            console.log("Candidate exists",ev.candidate)
            const objCandidate={
                'offerObj':offerObj ? offerObj : null,
                'candidate':ev.candidate,
                'username':userName,
                'isOffer':isOffer
            }
            console.log('showing cand Object: \n',objCandidate)
            socket.emit('new-candidate',objCandidate)
        }
    });
    peerConnection.addEventListener('track',ev=>{
        // handle remote streams
        console.log("Track events shoudl be trigger at the end")
        console.log(ev)
        const [remoteStream]=ev.streams; 
        remoteVideo.srcObject=remoteStream;
    }
    );

    if(offerObj){
       await peerConnection.setRemoteDescription(offerObj.offer)
    }

  }catch(err){
    console.log(err)
  }
}

const call = async()=>{
    await fetchUserMedia()
    await createPeerConnection(null,true)
   try{

    const offer= await peerConnection.createOffer()
    peerConnection.setLocalDescription(offer)
    socket.emit('offer',offer)
   }catch(err){
    console.log(err)
   }
}



const answerCall=async(offerObj)=>{
    console.log("Registing new answer...")

    await fetchUserMedia()
    await createPeerConnection(offerObj,false)
    console.log("Answer was made...")

    try{
       
        // set logic for remote connection
        // Obtain Ice candidates from server
        const answer =await  peerConnection.createAnswer()
        console.log('Answer was created...')
        await peerConnection.setLocalDescription(answer)
        console.log("answer was set-up")
        offerObj.answer = answer 
        await peerConnection.setRemoteDescription(offerObj.offer)
        //const candidates=await socket.emitWithAck('new-answer',offerObj)
        const candidates = await new Promise((resolve, reject) => {
            socket.emit('new-answer', offerObj, (response) => {
                if (response) {
                    resolve(response); // Acknowledgment response from the server
                } else {
                    reject(new Error("No candidates received"));
                }
            });
        });
        console.log('Showing teh candidates',candidates)
        peerConnection.addIceCandidate(candidates)
        console.log('adding Ice candidates')
        
    } catch(err){
      console.log(err)  
    } 
}


const createOfferEl=(offer)=>{
    let container=document.getElementById("container")
    let divElement=document.createElement("div")
    divElement.innerHTML=`<button>Answer-${offer.offerUsername}</button>`
    divElement.addEventListener('click',()=>answerCall(offer))
    container.appendChild(divElement)
    
}
document.getElementById('call-btn').addEventListener('click',e=>call())

socket.on('newOffer', offer => {
    console.log("\nCreating new OfferElement")
    createOfferEl(offer)
})

socket.on('availableOffers',offers=>{
    console.log("Some offers available")
    offers.forEach((offer)=>{
        createOfferEl(offer)
    })
})

const addAnswer=async(answer)=>{
    await peerConnection.setRemoteDescription(answer)
    console.log("Remote description added in locall offer")
}
socket.on('answer',answer=>{
    addAnswer(answer)
}) // answer 

socket.on('candidateFromAnswer',candidate=>{

    console.log("Cnadidates from asnwer received")
    // adde it to offerPeer conection 
    peerConnection.addIceCandidate(candidate)
    
}) // candidates

