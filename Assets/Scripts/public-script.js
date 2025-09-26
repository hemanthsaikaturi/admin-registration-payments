// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

// --- Element Definitions ---
const preloader = document.getElementById("preloader");
const content = document.getElementById("content");
const mainContent = document.getElementById('main-content');
const registrationSection = document.getElementById('registration-section');
const regFormContainer = document.getElementById('registration-form-container');
const regForm = document.getElementById('public-reg-form');
const participantTypeSelector = document.getElementById('participant-type-selector');

// --- PRELOADER HIDING FUNCTION ---
function hidePreloader() {
    if (preloader && content) {
        preloader.style.opacity = "0";
        setTimeout(() => {
            preloader.style.display = "none";
            content.style.visibility = "visible";
            content.style.opacity = "1";
        }, 1000);
    }
}

// --- MAIN FUNCTION TO LOAD EVENT ---
async function loadActiveEvent() {
    try {
        const eventsRef = db.collection('events');
        const snapshot = await eventsRef.where('isActive', '==', true).limit(1).get();
        if (snapshot.empty) {
            displayNoEventMessage();
        } else {
            const eventDoc = snapshot.docs[0];
            const eventData = eventDoc.data();
            displayEventDetails(eventData);
            if (eventData.status === 'open') {
                setupRegistrationFlow(eventData);
                if (registrationSection) registrationSection.style.display = 'block';
            } else {
                displayRegistrationClosedMessage();
            }
        }
    } catch (error) {
        console.error("Error loading active event:", error);
        displayNoEventMessage("Error loading event. Please try again later.");
    } finally {
        hidePreloader();
    }
}

// --- DISPLAY FUNCTIONS ---
function displayNoEventMessage(message = "There are no active events at the moment. Please check back later!") {
    if(mainContent) mainContent.innerHTML = `<div class="container text-center my-5"><h2>${message}</h2></div>`;
}

function displayRegistrationClosedMessage() {
    if (registrationSection) {
        registrationSection.style.display = 'block';
        registrationSection.innerHTML = `<div class="registration-closed text-center my-5"><h1>Registrations are currently closed.</h1></div>`;
    }
}

function displayEventDetails(event) {
    if (mainContent) {
        mainContent.innerHTML = `<section class="about"> <div class="container"> <div class="section-header"><h2>${event.eventName}</h2></div> <div class="row"> <div class="col-12"> <div class="main-poster"><img class="img" src="${event.posterURL}" alt="${event.eventName}"></div> <div class="event-description"><p class="description">${event.description}</p></div> </div> </div> </div> </section>`;
    }
}

// --- REGISTRATION FLOW SETUP ---
function setupRegistrationFlow(event) {
    const audience = event.eventAudience || 'students_only';

    if (audience === 'students_and_faculty') {
        participantTypeSelector.style.display = 'block';
        participantTypeSelector.innerHTML = `
            <p><strong>Please select your role:</strong></p>
            <div class="role-selection-buttons">
                <button class="btn btn-primary btn-lg" id="student-choice-btn">I am a Student</button>
                <button class="btn btn-secondary btn-lg" id="faculty-choice-btn">I am a Faculty</button>
            </div>
        `;
        document.getElementById('student-choice-btn').addEventListener('click', () => {
            generateRegistrationForm(event, 'student');
        });
        document.getElementById('faculty-choice-btn').addEventListener('click', () => {
            generateRegistrationForm(event, 'faculty');
        });
    } else if (audience === 'students_only') {
        generateRegistrationForm(event, 'student');
    } else if (audience === 'faculty_only') {
        generateRegistrationForm(event, 'faculty');
    }
}

function generateCustomQuestions(event, participantCategory) {
    let customQuestions = [];
    if (participantCategory === 'student' && event.studentCustomQuestions) {
        customQuestions = event.studentCustomQuestions;
    } else if (participantCategory === 'faculty' && event.facultyCustomQuestions) {
        customQuestions = event.facultyCustomQuestions;
    }
    
    let questionsHTML = '';
    if (customQuestions && customQuestions.length > 0) {
        questionsHTML = `<div class="participant"><label class="participant-label">Additional Questions</label><div class="fields">`;
        customQuestions.forEach((q, i) => {
            const questionNumber = i + 1;
            const fieldId = `custom_q_${i}`;
            const fieldName = `custom_q_${q.label.replace(/\s+/g, '_')}`;
            const questionLabel = `${questionNumber}. ${q.label}`;

            if (q.type === 'text') {
                questionsHTML += `<div class="floating-label"><textarea class="form-control" id="${fieldId}" name="${fieldName}" placeholder=" " required></textarea><label for="${fieldId}">${questionLabel}</label></div>`;
            } else { 
                questionsHTML += `<div class="form-group"><select class="form-control" id="${fieldId}" name="${fieldName}" required><option value="" disabled selected>${questionLabel}</option>`;
                if (q.type === 'yesno') {
                    questionsHTML += `<option value="Yes">Yes</option><option value="No">No</option>`;
                } else if (q.type === 'rating') {
                    for (let j = 1; j <= 10; j++) questionsHTML += `<option value="${j}">${j}</option>`;
                }
                questionsHTML += `</select></div>`;
            }
        });
        questionsHTML += `</div></div>`;
    }
    return questionsHTML;
}

// --- FORM GENERATION (FINAL VERSION) ---
function generateRegistrationForm(event, participantCategory) {
    participantTypeSelector.style.display = 'none';
    regForm.style.display = 'block';

    let finalHTML = '';
    
    let paymentSectionHTML = '';
    if (event.paymentsEnabled && event.qrCodeURL) {
        const fee = participantCategory === 'student' ? (event.studentFee || 0) : (event.facultyFee || 0);
        paymentSectionHTML = `
            <div id="payment-section" style="display: none;">
                <div class="participant">
                    <label class="participant-label">Payment Details</label>
                    <div class="payment-details-container text-center">
                        <p class="payment-instructions text-left">${event.paymentInstructions || ''}</p>
                        <h5 class="mt-2"><strong>Event Fee: ₹${fee}</strong></h5>
                        <img src="${event.qrCodeURL}" alt="Payment QR Code" style="max-width: 220px; border-radius: 8px;" class="mb-3">
                        <div class="floating-label w-100 mb-3"><input type="text" class="form-control" id="transactionId" name="transactionId" placeholder=" "><label for="transactionId">UPI Transaction ID</label></div>
                        <div class="w-100">
                            <label for="paymentScreenshot" class="file-drop-area">
                                <input id="paymentScreenshot" type="file" name="paymentScreenshot" accept="image/*">
                                <i class="fas fa-cloud-upload-alt file-drop-area-icon"></i>
                                <span class="file-drop-area-text">Drop screenshot here</span>
                                <span class="file-drop-area-browse">Browse</span>
                            </label>
                            <div id="file-chosen" class="file-chosen-text">*No file selected</div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    const isCardUploadRequired = event.paymentsEnabled && event.isFreeForIeeeMembers !== false;
    
    let ieeeMemberSectionHTML = `
        <div id="ieee-member-section" style="display: none;">
            <div class="participant">
                <label class="participant-label">IEEE Member Details</label>`;
    
    if (isCardUploadRequired) {
        ieeeMemberSectionHTML += `<p>Registration for this event is free for IEEE members. Please provide your membership details for verification.</p>`;
    }
    
    ieeeMemberSectionHTML += `
                <div class="floating-label">
                    <input type="tel" class="form-control" id="membershipId" name="membershipId" placeholder=" ">
                    <label for="membershipId">IEEE Membership ID</label>
                </div>`;

    if (isCardUploadRequired) {
        ieeeMemberSectionHTML += `
                <div>
                    <label for="membershipCard" class="file-drop-area">
                        <input id="membershipCard" type="file" name="membershipCard" accept="image/*,.pdf">
                        <i class="fas fa-id-card file-drop-area-icon"></i>
                        <span class="file-drop-area-text">Drop membership card here</span>
                        <span class="file-drop-area-browse">Browse</span>
                    </label>
                    <div id="card-chosen" class="file-chosen-text">*No file selected</div>
                </div>`;
    }
    
    ieeeMemberSectionHTML += `</div></div>`;
    
    const teamSizeSelectorContainer = document.getElementById('team-size-selector-container');
    let teamSizeSelectorHTML = '';

    if (event.participationType === 'team' && event.minTeamSize !== event.maxTeamSize) {
        const min = event.minTeamSize || 2;
        const max = event.maxTeamSize || 4;
        let options = '';
        for (let i = min; i <= max; i++) {
            options += `<option value="${i}">${i} Members</option>`;
        }
        teamSizeSelectorHTML = `
            <div class="form-group">
                <label for="team-size-selector" style="font-weight: 500;">Select Team Size:</label>
                <select class="form-control" id="team-size-selector">${options}</select>
            </div>`;
        teamSizeSelectorContainer.innerHTML = teamSizeSelectorHTML;
        teamSizeSelectorContainer.style.display = 'block';
    } else {
        teamSizeSelectorContainer.style.display = 'none';
    }
    
    finalHTML += `<div id="participant-fields-container"></div>`;
    finalHTML += ieeeMemberSectionHTML;
    finalHTML += paymentSectionHTML;
    finalHTML += generateCustomQuestions(event, participantCategory);
    
    if (regFormContainer) {
        regFormContainer.innerHTML = finalHTML;

        // Helper function to attach all necessary event listeners
        const attachEventListeners = () => {
            const membershipIdInput = document.getElementById('membershipId');
            if (membershipIdInput) {
                membershipIdInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }

            // The crucial listener is for the FIRST participant's dropdown
            const ieeeMemberSelect = document.getElementById('p1_ieee_member'); 
            if (ieeeMemberSelect) {
                ieeeMemberSelect.addEventListener('change', (e) => {
                    const isMember = e.target.value === 'Yes';
                    const isFreeForMembers = event.isFreeForIeeeMembers !== false;
                    const cardUploadInput = document.getElementById('membershipCard');
                    const paymentSection = document.getElementById('payment-section');
                    const ieeeMemberSection = document.getElementById('ieee-member-section');
                    
                    const needsPayment = !isMember || (isMember && !isFreeForMembers);

                    if (ieeeMemberSection) ieeeMemberSection.style.display = isMember ? 'block' : 'none';
                    if (paymentSection) paymentSection.style.display = needsPayment ? 'block' : 'none';

                    document.getElementById('transactionId').required = needsPayment;
                    document.getElementById('paymentScreenshot').required = needsPayment;
                    document.getElementById('membershipId').required = isMember;
                    if (cardUploadInput) {
                        cardUploadInput.required = isMember && isFreeForMembers;
                    }
                });
            }
            
            setupDropArea('paymentScreenshot');
            setupDropArea('membershipCard');
        };
        
        const generateParticipantFields = (count) => {
            const container = document.getElementById('participant-fields-container');
            container.innerHTML = '';
            let participantHTML = '';
            const isStudent = participantCategory === 'student';
            
            for (let i = 1; i <= count; i++) {
                const pLabel = count > 1 ? `Participant ${i}` : (isStudent ? 'Student' : 'Faculty');
                participantHTML += `
                    <div class="participant">
                        <label class="participant-label">${pLabel} Details</label>
                        <div class="fields">
                            <div class="row">
                                <div class="col-md-6"><div class="floating-label"><input type="text" class="form-control" id="p${i}_name" name="p${i}_name" placeholder=" " required><label for="p${i}_name">Name</label></div></div>
                                <div class="col-md-6"><div class="floating-label"><input type="text" class="form-control" id="${isStudent ? `p${i}_college` : `p${i}_dept`}" name="${isStudent ? `p${i}_college` : `p${i}_dept`}" placeholder=" " required><label for="${isStudent ? `p${i}_college` : `p${i}_dept`}">${isStudent ? 'College Name' : 'Department'}</label></div></div>
                            </div>`;
                if (isStudent) {
                    participantHTML += `
                            <div class="row">
                                <div class="col-md-4"><div class="form-group"><select class="form-control" id="p${i}_year" name="p${i}_year" required><option value="" disabled selected>Select Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option></select></div></div>
                                <div class="col-md-4"><div class="form-group"><select class="form-control" id="p${i}_branch" name="p${i}_branch" required><option value="" disabled selected>Select Branch</option><option value="CIVIL">CIVIL</option><option value="CSB">CSB</option><option value="CSC">CSC</option><option value="CSD">CSD</option><option value="CSE">CSE</option><option value="CSM">CSM</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="IT">IT</option><option value="MECH">MECH</option><option value="OTHERS">OTHERS</option></select></div></div>
                                <div class="col-md-4"><div class="form-group"><select class="form-control" id="p${i}_section" name="p${i}_section" required><option value="" disabled selected>Select Section</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="F">F</option><option value="OTHERS">OTHERS</option></select></div></div>
                            </div>
                            <div class="row">
                                <div class="col-md-12"><div class="floating-label"><input type="text" class="form-control" id="p${i}_roll" name="p${i}_roll" required pattern="[a-zA-Z0-9]{10}" maxlength="10" placeholder=" " title="Please enter a 10-character Roll No."><label for="p${i}_roll">Roll No.</label></div></div>
                            </div>`;
                }
                participantHTML += `
                            <div class="row">
                                <div class="col-md-6"><div class="floating-label"><input type="email" class="form-control" id="p${i}_email" name="p${i}_email" placeholder=" " required><label for="p${i}_email">Email</label></div></div>
                                <div class="col-md-6"><div class="floating-label"><input type="tel" class="form-control" id="p${i}_phone" name="p${i}_phone" placeholder=" " required><label for="p${i}_phone">Phone No.</label></div></div>
                            </div>`;
                // Only add the IEEE Member dropdown to the first participant
                if (i === 1) {
                    participantHTML += `
                            <div class="form-group">
                                <select class="form-control" id="p1_ieee_member" name="p1_ieee_member" required><option value="" disabled selected>Are you an IEEE Member?</option><option value="Yes">Yes</option><option value="No">No</option></select>
                            </div>
                            <div class="info-text-wrapper">
                                <a href="#" data-toggle="modal" data-target="#infoModal">How do I find my Member ID?</a>
                            </div>`;
                }
                participantHTML += `</div></div>`;
            }
            container.innerHTML = participantHTML;
            attachEventListeners(); // Re-attach listeners after redrawing
        };

        const teamSizeSelector = document.getElementById('team-size-selector');

        if (event.participationType === 'team') {
            if (teamSizeSelector) {
                generateParticipantFields(parseInt(teamSizeSelector.value, 10));
                teamSizeSelector.addEventListener('change', (e) => {
                    generateParticipantFields(parseInt(e.target.value, 10));
                });
            } else {
                generateParticipantFields(event.maxTeamSize);
            }
        } else {
            generateParticipantFields(1);
        }

        setTimeout(() => {
            regForm.classList.add('is-visible');
        }, 10);
    }
}

function setupDropArea(inputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput) return;
    
    const dropArea = fileInput.parentElement;
    const chosenTextId = inputId === 'paymentScreenshot' ? 'file-chosen' : 'card-chosen';
    const chosenText = document.getElementById(chosenTextId);

    fileInput.addEventListener('change', () => {
        chosenText.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : '*No file selected';
    });

    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}


// --- FORM SUBMISSION ---
if (regForm) {
    regForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitButton = document.getElementById("submit-button");
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            const eventsRef = db.collection("events");
            const snapshot = await eventsRef.where("isActive", "==", true).limit(1).get();
            if (snapshot.empty) {
                Swal.fire("Registration Closed", "This event is no longer active.", "warning");
                return;
            }

            const eventData = snapshot.docs[0].data();
            const formData = new FormData(regForm);
            const registrationData = {};
            
            const teamSize = eventData.participationType === 'team' ? (document.getElementById('team-size-selector') ? parseInt(document.getElementById('team-size-selector').value, 10) : eventData.maxTeamSize) : 1;
            registrationData.participantCount = teamSize;

            for (const [key, value] of formData.entries()) {
                if (!['paymentScreenshot', 'membershipCard'].includes(key)) {
                    registrationData[key] = value;
                }
            }

            registrationData.timeStamp = firebase.firestore.FieldValue.serverTimestamp();
            const isMember = formData.get('p1_ieee_member') === 'Yes';
            const isFreeForMembers = eventData.isFreeForIeeeMembers !== false;
            const needsToPay = !isMember || (isMember && !isFreeForMembers);

            if (isMember) {
                registrationData.isIeeeMember = true;
                registrationData.membershipId = formData.get("membershipId");
                
                if (isFreeForMembers && eventData.paymentsEnabled) {
                    const cardFile = formData.get("membershipCard");
                    if (!cardFile || cardFile.size === 0) throw new Error("IEEE Membership Card is required.");
                    const cardRef = storage.ref(`membership_cards/${Date.now()}_${cardFile.name}`);
                    const uploadTask = await cardRef.put(cardFile);
                    registrationData.membershipCardURL = await uploadTask.ref.getDownloadURL();
                }
            } else {
                 registrationData.isIeeeMember = false;
            }

            if (eventData.paymentsEnabled && needsToPay) {
                const screenshotFile = formData.get("paymentScreenshot");
                if (!screenshotFile || screenshotFile.size === 0) throw new Error("Payment screenshot is required.");
                
                registrationData.transactionId = formData.get("transactionId");

                const screenshotRef = storage.ref(`screenshots/${Date.now()}_${screenshotFile.name}`);
                const uploadTask = await screenshotRef.put(screenshotFile);
                registrationData.screenshotURL = await uploadTask.ref.getDownloadURL();
            }

            registrationData.verificationStatus = (eventData.paymentsEnabled && needsToPay) || (isMember && isFreeForMembers) ? "pending" : "not-required";
            
            const collectionSuffix = "Participants";
            const collectionName = `${eventData.eventName.replace(/\s+/g, "")}${collectionSuffix}`;
            await db.collection(collectionName).add(registrationData);

            let allEmails = [];
            let allNames = [];
            for(let i=1; i<=teamSize; i++){
                allEmails.push(formData.get(`p${i}_email`));
                allNames.push(formData.get(`p${i}_name`));
            }

            const mailCollectionName = `${eventData.eventName.replace(/\s+/g, "")}Mails`;
            const mailSubject = `Registration Received for ${eventData.eventName} | IEEE - VBIT SB`;
            let mailBody = eventData.emailTemplate.replace(/{name}/g, allNames.join(" & ")).replace(/{eventName}/g, eventData.eventName);
            if (allEmails.length > 0 && allEmails[0]) {
                await db.collection(mailCollectionName).add({ to: allEmails, message: { subject: mailSubject, html: mailBody } });
            }

            const successTitle = (eventData.paymentsEnabled && needsToPay) || (isMember && isFreeForMembers) ? "Registration Submitted!" : "Registration Successful!";
            const successText = (eventData.paymentsEnabled && needsToPay) || (isMember && isFreeForMembers) ? "Your spot is reserved. You will receive a final confirmation email once your details are verified by our team." : "Thank you for registering. You will receive a confirmation email shortly.";
            Swal.fire({ title: successTitle, text: successText, icon: 'info', confirmButtonText: "Great!" }).then(() => { window.location.href = "about.html"; });

        } catch (error) {
            console.error("Error submitting registration:", error);
            Swal.fire("Submission Error", error.message, "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit";
        }
    });
}

// --- INITIALIZE THE PAGE ---
loadActiveEvent();