// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let allRegistrationsData = [];

async function displayRegistrations(eventId) {
  const container = document.getElementById("registrations-list-container");
  const table = document.getElementById("registrations-table");
  const loader = document.getElementById("registrations-list-loader");
  const headerContainer = document.getElementById("registrations-table-header");

  loader.style.display = "block";
  table.style.display = "none";

  try {
    const eventDoc = await db.collection("events").doc(eventId).get();
    if (!eventDoc.exists) throw new Error("Event document not found.");
    
    const eventData = eventDoc.data();
    document.getElementById("event-name-title").textContent = `Registrations for: ${eventData.eventName}`;

    const registrationCollectionName = `${eventData.eventName.replace(/\s+/g, "")}Participants`;

    db.collection(registrationCollectionName).orderBy("timeStamp", "desc").onSnapshot((snapshot) => {
        container.innerHTML = "";
        headerContainer.innerHTML = "";
        allRegistrationsData = [];

        if (snapshot.empty) {
            loader.innerHTML = "<p>No registrations found for this event.</p>";
            document.getElementById("export-csv-button").disabled = true;
            return;
        }
        
        let headers = ["Timestamp", "Category", "Participant(s)", "Contact", "College/Dept", "ID", "Proof", "Status", "Actions"];
        headerContainer.innerHTML = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;

        snapshot.forEach((doc) => {
            const reg = doc.data();
            reg.docId = doc.id;
            allRegistrationsData.push(reg);
            
            const date = reg.timeStamp ? reg.timeStamp.toDate().toLocaleString() : "N/A";
            const category = reg.participantCategory || "student";
            
            let names = [];
            let contacts = [];
            for (let i = 1; i <= (reg.participantCount || 1); i++) {
                if(reg[`p${i}_name`]) names.push(reg[`p${i}_name`]);
                if(reg[`p${i}_email`]) contacts.push(reg[`p${i}_email`]);
            }

            const collegeOrDept = category === "student" ? reg.p1_college || "" : reg.p1_dept || "";

            let rowHTML = `<td>${date}</td>
                           <td><span class="badge badge-info">${category.toUpperCase()}</span></td>
                           <td>${names.join('<br>')}</td>
                           <td>${contacts.join('<br>')}</td>
                           <td>${collegeOrDept}</td>`;
            
            const statusBadge = reg.verificationStatus === "verified" ? `<span class="badge badge-success">Verified</span>` : `<span class="badge badge-warning">Pending</span>`;
            
            if (reg.isIeeeMember) {
                rowHTML += `<td>${reg.membershipId || "N/A"}</td>
                            <td><a href="${reg.membershipCardURL}" target="_blank" class="btn btn-sm btn-outline-info">View Card</a></td>`;
            } else {
                rowHTML += `<td>${reg.transactionId || "N/A"}</td>
                            <td>${reg.screenshotURL ? `<a href="${reg.screenshotURL}" target="_blank" class="btn btn-sm btn-outline-info">View</a>` : "N/A"}</td>`;
            }

            rowHTML += `<td>${statusBadge}</td>`;

            if (reg.verificationStatus !== 'not-required') {
                 rowHTML += `<td>
                                ${reg.verificationStatus !== "verified" ? `<button class="btn btn-sm btn-primary verify-btn" data-doc-id="${doc.id}">Verify</button>` : "Confirmed"}
                            </td>`;
            } else {
                rowHTML += `<td>N/A</td>`;
            }

            container.innerHTML += `<tr>${rowHTML}</tr>`;
        });

        loader.style.display = "none";
        table.style.display = "table";
        document.getElementById("export-csv-button").disabled = false;
        addVerificationListeners(registrationCollectionName, eventData);
    }, (error) => {
        console.error("Error fetching registrations: ", error);
        loader.innerHTML = "<p>Error loading registrations. The collection might not exist.</p>";
    });
  } catch (error) {
    console.error("Error setting up registration display:", error);
    loader.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

function addVerificationListeners(registrationCollectionName, eventData) {
  const tableBody = document.getElementById("registrations-list-container");
  tableBody.addEventListener("click", async (e) => {
    if (!e.target.matches(".verify-btn")) return;

    const button = e.target;
    const docId = button.dataset.docId;
    const registration = allRegistrationsData.find(reg => reg.docId === docId);
    if (!registration) return;

    const isMember = registration.isIeeeMember;

    Swal.fire({
      title: isMember ? "Verify IEEE Member?" : "Verify Payment?",
      text: "This will send the final confirmation email to all participants.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, verify and send!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        button.disabled = true;
        button.textContent = "Verifying...";

        try {
          await db.collection(registrationCollectionName).doc(docId).update({ verificationStatus: "verified" });
          
          const regData = registration;
          let allEmails = [];
          let allNames = [];
          for(let i=1; i<= (regData.participantCount || 1); i++){
              if(regData[`p${i}_email`]) allEmails.push(regData[`p${i}_email`]);
              if(regData[`p${i}_name`]) allNames.push(regData[`p${i}_name`]);
          }

          const mailCollectionName = `${eventData.eventName.replace(/\s+/g, "")}Mails`;
          const mailSubject = `Your Registration is Confirmed for ${eventData.eventName}!`;
          const mailBody = eventData.confirmationEmailTemplate.replace(/{name}/g, allNames.join(" & ")).replace(/{eventName}/g, eventData.eventName);

          if (allEmails.length > 0) {
            await db.collection(mailCollectionName).add({ to: allEmails, message: { subject: mailSubject, html: mailBody } });
            Swal.fire("Verified!", "Verification successful and confirmation email sent!", "success");
          } else {
            throw new Error("No participant emails found to send confirmation.");
          }
          
        } catch (error) {
          console.error("Error during verification: ", error);
          Swal.fire("Error!", "An error occurred during verification.", "error");
          button.disabled = false;
          button.textContent = "Verify";
        }
      }
    });
  });
}

function exportToCsv(filename, data) {
  if (!data || data.length === 0) {
        alert("No data to export.");
        return;
    }
    const processedData = JSON.parse(JSON.stringify(data));
    processedData.forEach(row => {
        if (row.timeStamp && typeof row.timeStamp === 'object') {
            const seconds = row.timeStamp.seconds || (row.timeStamp._seconds);
            if (seconds) {
                row.timeStamp = new Date(seconds * 1000).toLocaleString();
            }
        }
    });
    const allHeaders = new Set();
    processedData.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
    const headers = Array.from(allHeaders);
    const csvRows = [headers.join(",")];
    for (const row of processedData) {
        const values = headers.map(header => {
            const rawValue = row[header];
            let value;
            if (rawValue === null || rawValue === undefined) {
                value = '';
            } else if (typeof rawValue === 'object') {
                value = JSON.stringify(rawValue);
            } else {
                value = rawValue;
            }
            const escaped = ('' + value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const content = document.getElementById("dashboard-content");
    if (user) {
      loader.style.display = "none";
      content.style.display = "block";

      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get("eventId");

      if (eventId) {
        displayRegistrations(eventId);

        const exportButton = document.getElementById("export-csv-button");
        exportButton.addEventListener("click", () => {
          const eventName = document.getElementById("event-name-title").textContent.replace("Registrations for: ", "");
          const filename = `${eventName.replace(/\s+/g, "_")}_registrations.csv`;
          exportToCsv(filename, allRegistrationsData);
        });
      } else {
        document.getElementById("event-name-title").textContent = "Error: No Event ID Provided in URL.";
      }
    } else {
      window.location.href = "admin-login.html";
    }
  });
});