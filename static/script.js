// Constants to easily refer to pages
const HOME = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const CHANNELS = document.querySelector(".channels");
const THREADS = document.querySelector(".threads");

window.addEventListener("DOMContentLoaded", ()=>{
    loadEventListeners();
    sessionStorage.setItem("message_id", "0")
    sessionStorage.setItem("channel_name", "")
    sessionStorage.setItem("channel_id", "0")
    navigateTo(window.location.pathname);
})

window.addEventListener("popstate", () => {
    // clear the history on popstate events
    window.history.go(-(window.history.length - 1));
    console.log("popstate, delete history")
    navigateTo(window.location.pathname) }
); 

function navigateTo(path) {
    // add path to the history
    console.log("asked to go to ", path)
    history.pushState({}, "", path)
    // get credentials to see if user is logged in
    const user_api_key = sessionStorage.getItem("swalker10_auth_key")
    const logged_in = (user_api_key != null)
    
    if (logged_in && path=="/") {
        history.pushState({}, "", "/channels")
        router("/channels")
    }

    else if (logged_in && path=="/login") {
        history.pushState({}, "", "/channels")
        router("/channels")
    }

    else if (!logged_in && path=="/") {
        router("/")
    }

    else if (!logged_in && path!="/") {
        // history.pushState({}, "", "/login")
        router("/login")
    }

    else if (sessionStorage.getItem("message_id")==0 && path=="/threads") {
        history.pushState({}, "", "/channels")
        router("/channels")
    }

    else {
        router(path)
    }
}

// On page load, show the appropriate page and hide the others
let showOnly = (element) => {
    HOME.classList.add("hide")
    LOGIN.classList.add("hide")
    PROFILE.classList.add("hide")
    CHANNELS.classList.add("hide")
    THREADS.classList.add("hide")
  
    element.classList.remove("hide");
}


// direct system which page to display based on url path
function router(path) {
    const path_list = path.split("/")
    // home page
    if (path_list[1] == "") {
      showOnly(HOME);
    } 
    // login page
    else if (path_list[1] == "login") { 
        document.querySelector(".message").classList.add("hide")
        document.querySelector("#login-username").value = ""
        document.querySelector("#login-pw").value = ""
        showOnly(LOGIN);
    }
    // profile page
    else if (path_list[1] == "profile") { 
        document.querySelector("#profile-username").textContent = sessionStorage.getItem("user_name");
        document.querySelector("#name-set").value = "";
        document.querySelector("#pw-set").value = "";
        showOnly(PROFILE);
    }
    // channel page
    else if (path_list[1] == "channels") { 
        sessionStorage.setItem("message_id", 0)
        document.querySelector("#two-username").textContent = sessionStorage.getItem("user_name")
        showOnly(CHANNELS); 
        pollForChannels();
        pollForMessages();
    }
    // open threads page
    else if (path_list[1] == "threads") { 
        document.querySelector("#three-username").textContent= sessionStorage.getItem("user_name")
        showOnly(THREADS); 
        pollForChannels();
        pollForMessages();
    } 
    // page not found
    else {
      // show a 404
      console.log("404")
    } 
}

function loadEventListeners() {
    // "/" page:
    // 1. add event listener to log-in icon
    console.log("event listeners loaded")
    document.querySelector(".login-button").addEventListener("click", (event) =>{navigateTo("/login")}) 
    // 2. add event listener to sign-up icon
    document.querySelector(".signup").addEventListener("click", (event) =>{homeSignUp(event)}) 
    
    // "channels" page:
    // 1. edit profile button
    document.querySelector("#profile-button1").addEventListener("click", (event) =>{
        navigateTo("/profile")})
    // 2. when people click the + button to create a new channel
    document.querySelector("#create-channel1").addEventListener("click", (event) => {
        document.querySelector("#un-hide1").classList.remove("hide")
    })
    // 3. after people click the "create channel" button to save new channel
    document.querySelector("#hit-enter1").addEventListener("click", (event) => {
        event.preventDefault();
        channel_name = document.querySelector("#channel-set1").value;
        createNewChannel(channel_name, "two");
        document.querySelector("#un-hide1").classList.add("hide")
    })
    // 4. the post button
    document.querySelector("#post-button1").addEventListener("click", (event) => {
        event.preventDefault();
        postMessage("/channels");
        document.querySelector("#post-box1").value = ""
    })

    // "threads" page:
    // 1. edit profile button
    document.querySelector("#profile-button2").addEventListener("click", (event) =>{
        navigateTo("/profile")})
    // 2. when people click the + button to create a new channel
    document.querySelector("#create-channel2").addEventListener("click", (event) => {
        document.querySelector("#un-hide2").classList.remove("hide")
    })
    // 3. after people click the "create channel" button to save new channel
    document.querySelector("#hit-enter2").addEventListener("click", (event) => {
        event.preventDefault();
        channel_name = document.querySelector("#channel-set2").value;
        createNewChannel(channel_name, "three");
        document.querySelector("#un-hide2").classList.add("hide")
    })
    // 4. X button to close out the replies plane
    document.querySelector("#exit-threads").addEventListener("click", (event) =>{
        sessionStorage.setItem("message_id", 0)
        navigateTo("/channels")})
    
    // 5. the post message button
    document.querySelector("#post-button2").addEventListener("click", (event) => {
        event.preventDefault();
        postMessage("/threads");
        document.querySelector("#post-box2").value = ""
    })

    // 6. the post reply button
    document.querySelector("#reply-button").addEventListener("click", (event) => {
        event.preventDefault();
        postReply("/threads");
        document.querySelector("#reply-box").value = ""
    })

    // "profile" page:
    // 1. log-out button
    document.querySelector("#log-out").addEventListener("click", (event) =>{
        sessionStorage.clear();
        navigateTo("/")})
    // 2. return-to-channels button
    document.querySelector("#go-back").addEventListener("click", (event) =>{
        document.querySelector("#pw-set").value = "";
        document.querySelector("#name-set").value = "";
        history.back()})
    // 3. update name button
    document.querySelector("#updateUser").addEventListener("click", (event) =>{
        console.log("update user triggered")
        updateUsername(event)})
    // 4. update password button 
    document.querySelector("#updatePassword").addEventListener("click", (event) =>{updatePassword(event)})

    // "login" page:
    // 1. log-in button
    document.querySelector(".go-button").addEventListener("click", (event) =>{logIn(event)}) 
    // 2. signup button
    document.querySelector(".new").addEventListener("click", (event) =>{loginSignUp(event)}) 


}



function updateUsername(event) {
    event.preventDefault();
    new_username = document.querySelector("#name-set").value;
    console.log("profile page new = ", new_username);
    fetch(`/api/profile`, {
    method: "POST",
    headers: {
    "Content-Type": "application/json", 
    "auth-key": sessionStorage.getItem("swalker10_auth_key"),
    "username": new_username,
    "update-type": "username",
    },
    }).then(response => { if (response.status == 200) {
    // update the sessionStorage with new credentials
    console.log("your username has been updated")
    sessionStorage.setItem("user_name", new_username)
    document.querySelector("#profile-username").textContent = sessionStorage.getItem("user_name")
    }
    else {console.log("not valid")}})
}

function updatePassword(event) {
    event.preventDefault();
    new_pw = document.querySelector("#pw-set").value;
    console.log(new_pw);
    
    fetch(`/api/profile`, {
    method: "POST",
    headers: {
    "Content-Type": "application/json", 
    "auth-key": sessionStorage.getItem("swalker10_auth_key"),
    "username": sessionStorage.getItem("user_name"),
    "new-pw": new_pw,
    "update-type": "password",
    },
    }).then(response => { if (response.status == 200) {
    console.log("your password has been updated")
    }
    else {console.log("not valid")}})
}



function logIn(event) {
    event.preventDefault();
    username = document.querySelector("#login-username").value
    pw = document.querySelector("#login-pw").value
    console.log(pw, username, "login inputs")
    //send request to app.py to verify if valid user
    fetch(`/api/login`, {
        method: "GET",
        headers: {
        "Content-Type": "application/json",
        "password": pw,
        "username": username,
        },
        }).then(response => response.json())
        .then(info => {
        console.log(info)
        info.forEach(item => {
            // response will have their user_id and api_key
            const user_id = item.user_id
            const user_api_key = item.user_api_key
            //if their log-in is invalid, api-key will be null
            //and display error message
            if (user_api_key == null) {
            document.querySelector(".message").classList.remove("hide")
            }
            // otherwise, save their apikey in sessionStorage and redirect to "/"
            //page (they will be logged in)
            else {
            sessionStorage.setItem("swalker10_auth_key", user_api_key);
            sessionStorage.setItem("user_id", user_id);
            sessionStorage.setItem("user_name", username);
            history.back()
            }
        })})
}


function homeSignUp(event) {
    event.preventDefault();
    console.log("signing in");
    fetch(`/api/`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    }).then(response => response.json())
    .then(info => {
        sessionStorage.setItem("swalker10_auth_key", info[0].user_api);
        sessionStorage.setItem("user_name", info[0].user_name);
        sessionStorage.setItem("user_id", info[0].user_id);
        console.log(sessionStorage.getItem("user_name"))
        navigateTo("/channels");
    })
}

function loginSignUp(event) {
    event.preventDefault();
    console.log("signing in");
    fetch(`/api/login`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    }).then(response => response.json())
    .then(info => {
        sessionStorage.setItem("swalker10_auth_key", info[0].user_api);
        sessionStorage.setItem("user_name", info[0].user_name);
        sessionStorage.setItem("user_id", info[0].user_id);
        console.log(sessionStorage.getItem("user_name"))
        navigateTo("/channels");
    })
}
  


// create the left-hand column which displays the list of channels
function buildChannels(url) {
    if (url=="channels")  {
        fetch(`/api/channels`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "user-id": sessionStorage.getItem("user_id"),
            "get-type": "list-channels",
            "current-channel": sessionStorage.getItem("channel_id")
        },
        }).then(response => response.json())
        .then(info => {
        let block = document.querySelector("#channels-2col");
        block.innerHTML = "";
        if (info[0] == "no channels") {
            return
        }
        else { 
            info.forEach(item => {
                const channel_name = item.channel_name
                const channel_id = item.channel_id
                
                const div = document.createElement("div");
                if (channel_id == sessionStorage.getItem("channel_id")) {
                    div.setAttribute("id", "selected")
                }
                div.addEventListener("click", (event) => {
                    event.preventDefault();
                    sessionStorage.setItem("channel_id", channel_id);
                    sessionStorage.setItem("channel_name", channel_name);
                    sessionStorage.setItem("message_id", 0)
                    document.querySelector(".post1").classList.remove("hide")
                })
                div.classList.add("channel-option")
                div.setAttribute("number", channel_id)
                const name = document.createElement("name");
                name.innerHTML = channel_name;
                const space = document.createElement("br");
                // const unread = document.createElement("unread")
                
                // unread.textContent = item.unread + " unread"
                

                div.appendChild(name);
                div.appendChild(space);
                // div.appendChild(unread);
                block.appendChild(div);
                
            })}})   
    } 
    
    
    if (url=="threads")  {
        fetch(`/api/threads`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "user-id": sessionStorage.getItem("user_id"),
            "get-type": "list-channels",
            "current_channel": sessionStorage.getItem("channel_id")
        },
        }).then(response => response.json())
        .then(info => {
        let block = document.querySelector("#channels-3col");
        block.innerHTML = "";
        if (info[0] == "no channels") {
            return
        }
        else { 
            info.forEach(item => {
                const channel_name = item.channel_name
                const channel_id = item.channel_id
                
                const div = document.createElement("div");
                if (channel_id == sessionStorage.getItem("channel_id")) {
                    div.setAttribute("id", "selected")
                }
                div.addEventListener("click", (event) => {
                    event.preventDefault();
                    sessionStorage.setItem("channel_id", channel_id);
                    sessionStorage.setItem("channel_name", channel_name);
                    document.querySelector(".post2").classList.remove("hide")
                })
                div.classList.add("channel-option")
                div.setAttribute("number", channel_id)
                const name = document.createElement("name");
                name.innerHTML = channel_name;
                const space = document.createElement("br");
                // ADD UNREAD

                div.appendChild(name);
                div.appendChild(space);
                block.appendChild(div);
                
            })}})   
    }     
}


function createNewChannel(channel_name, page) {
    if (page == "two") {
        fetch(`/api/channels`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            "new-name": channel_name,
            "post-type": "channel"
            },
            }).then(response => { if (response.status == 200) {
            console.log("your channel has been saved")
            }
            else {console.log("not valid")}})
    }

    if (page == "three") {
        fetch(`/api/threads`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            "new-name": channel_name,
            "post-type": "channel"
            },
            }).then(response => { if (response.status == 200) {
            console.log("your channel has been saved")
            }
            else {console.log("not valid")}})
    }

}


function buildMessages(url) {
    if (url == "channels") {
        fetch(`/api/channels`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "get-type": "list-messages"
        }
        }).then(response => response.json())
        .then(info => {
            // console.log("YES MESSAGES")
            const messagesBlock = document.getElementById("messages-2col"); 
            messagesBlock.innerHTML = ""
            if (info.length > 0) {
                info.forEach(i => {
                    const newMessage = document.createElement("message");
                    const newAuthor = document.createElement("author");
                    const newContent = document.createElement("content");
                    const newImg = document.createElement("img");
                    const button1 = document.createElement("button");
                    const button2 = document.createElement("button");
                    const button3 = document.createElement("button");
                    const button4 = document.createElement("button");
                    const button5 = document.createElement("button");
                    const button6 = document.createElement("button");
                    const button7 = document.createElement("button");
                    const newLine = document.createElement("hr");
                    
                    newMessage.appendChild(newAuthor);
                    newMessage.appendChild(newContent);
                    newMessage.appendChild(newImg);
                    newMessage.appendChild(button1);
                    newMessage.appendChild(button2);
                    newMessage.appendChild(button3);
                    newMessage.appendChild(button4);
                    newMessage.appendChild(button5);
                    newMessage.appendChild(button6);
                    newMessage.appendChild(button7);
                    newMessage.appendChild(newLine);
                    messagesBlock.appendChild(newMessage);
                
                    messagesBlock.setAttribute("message_id", i.message_id)
                    newImg.setAttribute("src", i.img_src)
                    newContent.textContent = i.body;
                    newAuthor.textContent = i.author;
                    //replies button
                    // if (sessionStorage.getItem("message_id") == i.message_id) {
                    //     button1.classList.add("selected-thread")
                    // }
                    button1.textContent = i.num_replies + " replies"
                    button1.addEventListener("click", (event) => {
                        event.preventDefault();
                        sessionStorage.setItem("message_id", i.message_id)
                        navigateTo("/threads")
                    })
                    
                    // heart reaction button
                    num_hearts = i.hearts
                    button2.textContent =  num_hearts + " " + String.fromCodePoint(0x2764)
                    button2.classList.add("reaction")
                    button2.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("hearts", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    // thumbsup reaction button
                    num_thumbsup = i.thumbsup
                    button3.textContent =  num_thumbsup + " " +String.fromCodePoint(0x1F44D)
                    button3.classList.add("reaction")
                    button3.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsup", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //happyface
                    button4.textContent =  i.happyface + " " + String.fromCodePoint(0x1F600) 
                    button4.classList.add("reaction")
                    button4.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("happyface", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //laughing
                    button5.textContent =  i.laughing + " " + String.fromCodePoint(0x1F602)
                    button5.classList.add("reaction")
                    button5.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("laughing", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //star
                    button6.textContent = i.star + " " +String.fromCodePoint(0x2B50)
                    button6.classList.add("reaction")
                    button6.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("star", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //thumbsdown
                    button7.textContent = i.thumbsdown + " " + String.fromCodePoint(0x1F44E)
                    button7.classList.add("reaction")
                    button7.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsdown", i.message_id, sessionStorage.getItem("user_id"))
                    }) 
                  }) 
        }

     })
    }
    if (url == "threads") {
        fetch(`/api/threads`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "get-type": "list-messages"
        }
        }).then(response => response.json())
        .then(info => {
            // console.log("YES MESSAGES")
            const messagesBlock = document.getElementById("messages-3col"); 
            messagesBlock.innerHTML = ""
            if (info.length > 0) {
                info.forEach(i => {
                    const newMessage = document.createElement("message");
                    const newAuthor = document.createElement("author");
                    const newContent = document.createElement("content");
                    const newImg = document.createElement("img");
                    const button1 = document.createElement("button");
                    const button2 = document.createElement("button");
                    const button3 = document.createElement("button");
                    const button4 = document.createElement("button");
                    const button5 = document.createElement("button");
                    const button6 = document.createElement("button");
                    const button7 = document.createElement("button");
                    const newLine = document.createElement("hr");
                    
                    newMessage.appendChild(newAuthor);
                    newMessage.appendChild(newContent);
                    newMessage.appendChild(newImg);
                    newMessage.appendChild(button1);
                    newMessage.appendChild(button2);
                    newMessage.appendChild(button3);
                    newMessage.appendChild(button4);
                    newMessage.appendChild(button5);
                    newMessage.appendChild(button6);
                    newMessage.appendChild(button7);
                    newMessage.appendChild(newLine);
                    messagesBlock.appendChild(newMessage);
                
                    messagesBlock.setAttribute("message_id", i.message_id)
                    newImg.setAttribute("src", i.img_src)
                    newContent.textContent = i.body;
                    newAuthor.textContent = i.author;
                    //replies button
                    if (sessionStorage.getItem("message_id") == i.message_id) {
                        button1.classList.add("selected-thread")
                    }
                    button1.textContent = i.num_replies + " replies"
                    button1.addEventListener("click", (event) => {
                        event.preventDefault();
                        sessionStorage.setItem("message_id", i.message_id)
                    })
                    
                    // heart reaction button
                    num_hearts = i.hearts
                    button2.textContent =  num_hearts + " " + String.fromCodePoint(0x2764)
                    button2.classList.add("reaction")
                    button2.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("hearts", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    // thumbsup reaction button
                    num_thumbsup = i.thumbsup
                    button3.textContent =  num_thumbsup + " " +String.fromCodePoint(0x1F44D)
                    button3.classList.add("reaction")
                    button3.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsup", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //happyface
                    button4.textContent =  i.happyface + " " + String.fromCodePoint(0x1F600) 
                    button4.classList.add("reaction")
                    button4.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("happyface", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //laughing
                    button5.textContent =  i.laughing + " " + String.fromCodePoint(0x1F602)
                    button5.classList.add("reaction")
                    button5.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("laughing", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //star
                    button6.textContent = i.star + " " +String.fromCodePoint(0x2B50)
                    button6.classList.add("reaction")
                    button6.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("star", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //thumbsdown
                    button7.textContent = i.thumbsdown + " " + String.fromCodePoint(0x1F44E)
                    button7.classList.add("reaction")
                    button7.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsdown", i.message_id, sessionStorage.getItem("user_id"))
                    }) 
                  }) 
        }

     })
    }
}


function postMessage(url) {
    if (url == "/channels"){
        post = document.querySelector("#post-box1").value

        fetch(`/api/channels`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "channel-id": sessionStorage.getItem("channel_id"),
                "user-id": sessionStorage.getItem("user_id"),
                "post-type": "message"
            },
            body: JSON.stringify(post)
            }).then(response => { if (response.status == 200) {
                console.log("post made")
                }
                else {console.log("something went wrong")}})
    }
    if (url == "/threads"){
        post = document.querySelector("#post-box2").value

        fetch(`/api/threads`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "channel-id": sessionStorage.getItem("channel_id"),
                "user-id": sessionStorage.getItem("user_id"),
                "post-type": "message"
            },
            body: JSON.stringify(post)
            }).then(response => { if (response.status == 200) {
                console.log("post made")
                }
                else {console.log("something went wrong")}})
    }
}





function postReply() {
    
    reply = document.querySelector("#reply-box").value

    fetch(`/api/threads`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "message-id": sessionStorage.getItem("message_id"),
            "user-id": sessionStorage.getItem("user_id"),
            "post-type": "reply"
        },
        body: JSON.stringify(reply)
        }).then(response => { if (response.status == 200) {
            console.log("post made")
            }
            else {console.log("something went wrong")}})

}



  
  



function addReaction(emoji, message_id, user_id) {
    console.log("adding reaction")
    if (window.location.pathname.split('/')[1] =="channels") {
        fetch(`/api/channels`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "emoji": emoji,
                "message-id": message_id,
                "user-id": user_id,
                "post-type": "reaction"
            },
            }).then(response => { if (response.status == 200) {
                console.log("reaction made")
                }
                else {console.log("something went wrong")}})

    }
    if (window.location.pathname.split('/')[1] =="threads") {
        fetch(`/api/threads`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "emoji": emoji,
                "message-id": message_id,
                "user-id": user_id,
                "post-type": "reaction"
            },
            }).then(response => { if (response.status == 200) {
                console.log("reaction made")
                }
                else {console.log("something went wrong")}})

    }
    
}


function buildReplies() {
    fetch(`/api/threads`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "chat-id":sessionStorage.getItem("message_id"),
            "get-type": "list-threads"
        }
        }).then(response => response.json())
        .then(info => {
            // console.log("YES REPLIES")
            const messagesBlock = document.getElementById("replies-plane"); 
            messagesBlock.innerHTML = ""
            if (info.length > 0) {
                info.forEach(i => {
                    const newMessage = document.createElement("message");
                    const newAuthor = document.createElement("author");
                    const newContent = document.createElement("content");
                    const newImg = document.createElement("img");
                    const button2 = document.createElement("button");
                    const button3 = document.createElement("button");
                    const button4 = document.createElement("button");
                    const button5 = document.createElement("button");
                    const button6 = document.createElement("button");
                    const button7 = document.createElement("button");
                    const newLine = document.createElement("hr");
                    
                    newMessage.appendChild(newAuthor);
                    newMessage.appendChild(newContent);
                    newMessage.appendChild(newImg);
                    newMessage.appendChild(button2);
                    newMessage.appendChild(button3);
                    newMessage.appendChild(button4);
                    newMessage.appendChild(button5);
                    newMessage.appendChild(button6);
                    newMessage.appendChild(button7);
                    newMessage.appendChild(newLine);
                    messagesBlock.appendChild(newMessage);
                
                    messagesBlock.setAttribute("message_id", i.message_id)
                    newImg.setAttribute("src", i.img_src)
                    newContent.textContent = i.body;
                    newAuthor.textContent = i.author;
                    
                    // heart reaction button
                    num_hearts = i.hearts
                    button2.textContent =  num_hearts + " " + String.fromCodePoint(0x2764)
                    button2.classList.add("reaction")
                    button2.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("hearts", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    // thumbsup reaction button
                    num_thumbsup = i.thumbsup
                    button3.textContent =  num_thumbsup + " " +String.fromCodePoint(0x1F44D)
                    button3.classList.add("reaction")
                    button3.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsup", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //happyface
                    button4.textContent =  i.happyface + " " + String.fromCodePoint(0x1F600) 
                    button4.classList.add("reaction")
                    button4.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("happyface", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //laughing
                    button5.textContent =  i.laughing + " " + String.fromCodePoint(0x1F602)
                    button5.classList.add("reaction")
                    button5.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("laughing", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //star
                    button6.textContent = i.star + " " +String.fromCodePoint(0x2B50)
                    button6.classList.add("reaction")
                    button6.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("star", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //thumbsdown
                    button7.textContent = i.thumbsdown + " " + String.fromCodePoint(0x1F44E)
                    button7.classList.add("reaction")
                    button7.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsdown", i.message_id, sessionStorage.getItem("user_id"))
                    }) 
                  }) 
        }

     })

}

function headerMessage() {
    fetch(`/api/threads`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "channel-id": sessionStorage.getItem("channel_id"),
            "chat-id": sessionStorage.getItem("message_id"),
            "get-type": "header_message"
        }
        }).then(response => response.json())
        .then(info => {
            
            const messagesBlock = document.getElementById("header-three"); 
            messagesBlock.innerHTML = ""
            if (info.length > 0) {
                info.forEach(i => {
                    const newAuthor = document.createElement("author");
                    const newContent = document.createElement("content");
                    const newImg = document.createElement("img");
                    const button2 = document.createElement("button");
                    const button3 = document.createElement("button");
                    const button4 = document.createElement("button");
                    const button5 = document.createElement("button");
                    const button6 = document.createElement("button");
                    const button7 = document.createElement("button");
                    const newLine = document.createElement("br");
                    
                    messagesBlock.appendChild(newAuthor);
                    messagesBlock.appendChild(newContent);
                    messagesBlock.appendChild(newImg);
                    messagesBlock.appendChild(button2);
                    messagesBlock.appendChild(button3);
                    messagesBlock.appendChild(button4);
                    messagesBlock.appendChild(button5);
                    messagesBlock.appendChild(button6);
                    messagesBlock.appendChild(button7);
                    messagesBlock.appendChild(newLine);
                    
                    newImg.setAttribute("src", i.img_src)
                    newContent.textContent = i.body;
                    newAuthor.textContent = i.author;
                    
                    // heart reaction button
                    num_hearts = i.hearts
                    button2.textContent =  num_hearts + " " + String.fromCodePoint(0x2764)
                    button2.classList.add("reaction")
                    button2.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("hearts", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    // thumbsup reaction button
                    num_thumbsup = i.thumbsup
                    button3.textContent =  num_thumbsup + " " +String.fromCodePoint(0x1F44D)
                    button3.classList.add("reaction")
                    button3.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsup", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //happyface
                    button4.textContent =  i.happyface + " " + String.fromCodePoint(0x1F600) 
                    button4.classList.add("reaction")
                    button4.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("happyface", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //laughing
                    button5.textContent =  i.laughing + " " + String.fromCodePoint(0x1F602)
                    button5.classList.add("reaction")
                    button5.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("laughing", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //star
                    button6.textContent = i.star + " " +String.fromCodePoint(0x2B50)
                    button6.classList.add("reaction")
                    button6.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("star", i.message_id, sessionStorage.getItem("user_id"))
                    })
                    //thumbsdown
                    button7.textContent = i.thumbsdown + " " + String.fromCodePoint(0x1F44E)
                    button7.classList.add("reaction")
                    button7.addEventListener("click", (event) => {
                        event.preventDefault();
                        addReaction("thumbsdown", i.message_id, sessionStorage.getItem("user_id"))
                    }) 
                  }) 
        }

     })



}



function pollForChannels() {
    let intervalId = setInterval(() => {
        if (window.location.pathname.split('/')[1] == "channels") {
            buildChannels("channels");
        } 
        else if (window.location.pathname.split('/')[1] == "threads") {
            buildChannels("threads");
        } 
        else {
          clearInterval(intervalId);
          return;
        }
      }, 1000);
}

function pollForMessages() {
    let intervalId2 = setInterval(() => {
        if (window.location.pathname.split('/')[1] === "channels" || window.location.pathname.split('/')[1] === "threads") {  
            if (sessionStorage.getItem("channel_id") != "0") {
                document.querySelector("#name-2col").innerHTML = sessionStorage.getItem("channel_name")
                document.querySelector("#name-3col").innerHTML = sessionStorage.getItem("channel_name")
                buildMessages(window.location.pathname.split('/')[1]);
                if (window.location.pathname.split('/')[1] === "threads") {
                    headerMessage();
                    buildReplies();
                }
            } }
        else {
          clearInterval(intervalId2);
          return;
        }
      }, 500);
}