// Importing session_info function from getSession.js module
import {session_info} from "./getSession.js"
// Calling session_info function to retrieve current session information
var cur_session = session_info()

console.log(cur_session)

// Conditional check: if the user is not a manager (um = 'N'), hide the LoginUserBtn element
if(cur_session.um == 'N'){
    $('#LoginUserBtn').hide()
}

// Event listener for clicking LoginUserBtn
$('#LoginUserBtn').click(function(){
    location.href = '/UsersManagment'
})

// Event listener for clicking LogoutBtn
$('#LogoutBtn').click(function() {
    console.log("logout")
    // Redirecting to logout endpoint
    location.href = "/logout";
});

// Displaying the user's full name in the UserNameDisplay element
$('#UserNameDisplay').text(cur_session.FullName);


