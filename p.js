// Check user login

if(localStorage.getItem("loggedIn") != "true"){

    window.location.href = "login.html";
}

// Logout Function

function logout(){

    localStorage.removeItem("loggedIn");

    window.location.href = "login.html";
}