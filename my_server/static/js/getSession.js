// Function to fetch user session information synchronously
export function session_info() {
    // Declare variables to store user session information
    var UserID, FullName, final_info, um
    // Ajax request to fetch user session information
    $.ajax({
        type: "GET",
        url: "/UserSessionInfo",  // Endpoint to retrieve session info
        processData: false,
        contentType: "application/json",
        dataType: "json",
        async: false,  // Make the request synchronous
        success: function (data) {
            // Extract UserID, FullName, and um from the response data
            UserID = data['UserID']
            FullName = data['FullName']
            um = data['um']
            // Construct final_info object with retrieved session information
            final_info = {
                UserID: UserID,
                FullName: FullName,
                um: um
            };
        }
    })
     // Return the final_info object containing user session information
    return final_info
}