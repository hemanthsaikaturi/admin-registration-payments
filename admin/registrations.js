// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let allRegistrationsData = [];

async function displayRegistrations(eventId) {
    const container = document.getElementById('registrations-list-container');
    const table = document.getElementById('registrations-table');
    const loader = document.getElementById('registrations-list-loader');
    const headerContainer = document.getElementById('registrations-table-header');
    
    loader.style.display = 'block';
    table.style.display = 'none';

    try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (!eventDoc.exists) {
            throw new Error("Event document not found.");
        }
        const eventData = eventDoc.data();
        const eventName = eventData.eventName;
        document.getElementById('event-name-title').textContent = `Registrations for: ${eventName}`;

        const collectionSuffix = eventData.participationType === 'team' ? 'Teams' : 'Participants';
        const registrationCollectionName = `${eventName.replace(/\s+/g, '')}${collectionSuffix}`;

        db.collection(registrationCollectionName).orderBy('timeStamp', 'desc').onSnapshot(snapshot => {
            container.innerHTML = '';
            headerContainer.innerHTML = '';
            allRegistrationsData = [];
            
            if (snapshot.empty) {
                loader.innerHTML = '<p>No registrations found for this event.</p>';
                document.getElementById('export-csv-button').disabled = true;
                return;
            }
            
            let headers = ['Timestamp'];
            const maxParticipants = eventData.maxTeamSize || 1;
            for (let i = 1; i <= maxParticipants; i++) {
                headers.push(`P${i} Name`, `P${i} Email`, `P${i} Phone`);
            }
            const firstDocData = snapshot.docs[0].data();
            if (firstDocData.verificationStatus && firstDocData.verificationStatus !== 'not-required') {
                headers.push('Transaction ID', 'Screenshot', 'Status', 'Actions');
            }
            headerContainer.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

            snapshot.forEach(doc => {
                const reg = doc.data();
                allRegistrationsData.push(reg);
                const regId = doc.id;
                const date = reg.timeStamp ? reg.timeStamp.toDate().toLocaleString() : 'N/A';
                let rowHTML = `<td>${date}</td>`;
                for (let i = 1; i <= maxParticipants; i++) {
                    const name = reg[`p${i}_name`] || '';
                    if (name) {
                        rowHTML += `<td>${name}</td><td>${reg[`p${i}_email`] || ''}</td><td>${reg[`p${i}_phone`] || ''}</td>`;
                    } else if (eventData.participationType === 'team') {
                        rowHTML += `<td></td><td></td><td></td>`;
                    }
                }
                if (reg.verificationStatus && reg.verificationStatus !== 'not-required') {
                    const statusBadge = reg.verificationStatus === 'verified' ? `<span class="badge badge-success">Verified</span>` : `<span class="badge badge-warning">Pending</span>`;
                    rowHTML += `<td>${reg.transactionId || ''}</td><td><a href="${reg.screenshotURL}" target="_blank" class="btn btn-sm btn-outline-info">View</a></td><td>${statusBadge}</td><td>${reg.verificationStatus !== 'verified' ? `<button class="btn btn-sm btn-primary verify-btn" data-doc-id="${regId}">Verify</button>` : 'Confirmed'}</td>`;
                }
                container.innerHTML += `<tr>${rowHTML}</tr>`;
            });

            loader.style.display = 'none';
            table.style.display = 'table';
            document.getElementById('export-csv-button').disabled = false;
            addVerificationListeners(registrationCollectionName, eventData);

        }, error => {
            console.error("Error fetching registrations: ", error);
            loader.innerHTML = '<p>Error loading registrations. The collection might not exist.</p>';
        });
    } catch (error) {
        console.error("Error setting up registration display:", error);
        loader.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function addVerificationListeners(registrationCollectionName, eventData) {
    const tableBody = document.getElementById('registrations-list-container');
    tableBody.addEventListener('click', async (e) => {
        if (!e.target.matches('.verify-btn')) return;

        const button = e.target;
        const docId = button.dataset.docId;

        Swal.fire({
            title: 'Verify Payment?',
            text: "This will send the final confirmation email to the participant(s).",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, verify and send!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                button.disabled = true;
                button.textContent = 'Verifying...';
                
                try {
                    await db.collection(registrationCollectionName).doc(docId).update({ verificationStatus: 'verified' });
                    const regDoc = await db.collection(registrationCollectionName).doc(docId).get();

                    if (regDoc.exists) {
                        const regData = regDoc.data();
                        const mailCollectionName = `${eventData.eventName.replace(/\s+/g, '')}Mails`;
                        const emails = [];
                        const names = [];
                        for(let i=1; i <= (regData.participantCount || 1); i++) {
                            if(regData[`p${i}_email`]) emails.push(regData[`p${i}_email`]);
                            if(regData[`p${i}_name`]) names.push(regData[`p${i}_name`]);
                        }
                        
                        // =========== CRITICAL FIX START ===========
                        // Use the single 'emailTemplate' field, not 'confirmationEmailTemplate'
                        const mailBody = eventData.emailTemplate
                            .replace(/{name}/g, names.join(' & '))
                            .replace(/{eventName}/g, eventData.eventName);
                        // =========== CRITICAL FIX END ===========
                            
                        await db.collection(mailCollectionName).add({
                            to: emails,
                            message: {
                                subject: `Your Registration is Confirmed for ${eventData.eventName}!`,
                                html: mailBody
                            }
                        });
                        Swal.fire(
                            'Verified!',
                            'Verification successful and confirmation email sent!',
                            'success'
                        );
                    } else {
                        throw new Error("Could not find the registration document after updating.");
                    }
                } catch (error) {
                    console.error("Error during verification: ", error);
                    Swal.fire(
                        'Error!',
                        'An error occurred during verification.',
                        'error'
                    );
                    button.disabled = false;
                    button.textContent = 'Verify';
                }
            }
        });
    });
}

function exportToCsv(filename, data) {
    if (data.length === 0) return;
    const allHeaders = new Set();
    data.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
    const headers = Array.from(allHeaders);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] === undefined ? '' : row[header];
            const escaped = ('' + value).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        const loader = document.getElementById('loader');
        const content = document.getElementById('dashboard-content');
        if (user) {
            loader.style.display = 'none';
            content.style.display = 'block';

            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('eventId');

            if (eventId) {
                displayRegistrations(eventId);

                const exportButton = document.getElementById('export-csv-button');
                exportButton.addEventListener('click', () => {
                    const eventName = document.getElementById('event-name-title').textContent.replace('Registrations for: ', '');
                    const filename = `${eventName.replace(/\s+/g, '_')}_registrations.csv`;
                    exportToCsv(filename, allRegistrationsData);
                });
            } else {
                document.getElementById('event-name-title').textContent = 'Error: No Event ID Provided in URL.';
            }
        } else {
            window.location.href = 'admin-login.html';
        }
    });
});