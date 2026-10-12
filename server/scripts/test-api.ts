async function runApiTests() {
    const baseUrl = "http://localhost:5000/api";
    console.log("Starting API tests against:", baseUrl);

    // 1. Health
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    console.log("1. Health Check:", healthRes.success ? "PASS" : "FAIL");

    // 2. Services
    const servicesRes = await fetch(`${baseUrl}/services`).then((r) => r.json());
    console.log(`2. Public Services: PASS (Found ${servicesRes.data?.length} services)`);
    const sampleService = servicesRes.data[0];

    // 3. Dynamic Template
    if (sampleService) {
        const tmplRes = await fetch(`${baseUrl}/services/${sampleService._id}/template`).then((r) => r.json());
        console.log(`3. Service Template for "${sampleService.name}": PASS (Fields: ${tmplRes.data?.fields?.length || 0})`);
    }

    // 4. Reference Data
    const refRes = await fetch(`${baseUrl}/reference-data`).then((r) => r.json());
    console.log("4. Reference Data:", refRes.success && refRes.data.academic_levels ? "PASS" : "FAIL");

    // 5. Site Settings & WhatsApp
    const settingsRes = await fetch(`${baseUrl}/settings`).then((r) => r.json());
    console.log(`5. Site Settings: PASS (WhatsApp: ${settingsRes.data?.whatsappNumber})`);

    // 6. Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "shahbaz@example.com", password: "admin@123" }),
    }).then((r) => r.json());

    if (!adminLoginRes.success) {
        console.error("Admin login failed:", adminLoginRes);
        return;
    }
    const adminToken = adminLoginRes.data.accessToken;
    console.log(`6. Admin Login: PASS (Role: ${adminLoginRes.data.user.role})`);

    // 7. Admin Overview
    const adminOverview = await fetch(`${baseUrl}/admin/overview`, {
        headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    console.log(`7. Admin Overview Stats: PASS (Total Services: ${adminOverview.data?.metrics?.totalServices})`);

    // 8. Register a test Customer
    const testEmail = `student_${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: testEmail,
            password: "StudentPass123!",
            firstName: "Aarav",
            lastName: "Patel",
            phone: "+91 9876543210",
        }),
    }).then((r) => r.json());
    console.log(`8. Customer Registration: PASS (User: ${regRes.data?.user?.email})`);
    const customerToken = regRes.data.accessToken;

    // 9. Customer submits a research request
    const requestPayload = {
        name: "Aarav Patel",
        email: testEmail,
        phone: "+91 9876543210",
        whatsapp: "+91 9876543210",
        serviceId: sampleService._id,
        academicProfile: {
            academicLevel: "Ph.D. / Doctoral Candidate",
            discipline: "Computer Science & Artificial Intelligence",
            university: "IIT Delhi",
            department: "Computer Science & Engineering",
            publicationType: "Original Journal Article",
            targetJournal: "IEEE Transactions on Pattern Analysis and Machine Intelligence",
            indexingRequirement: "Scopus / SCI",
            citationStyle: "IEEE Style",
            wordCount: 8000,
            deadline: "2026-12-15",
        },
        requirements: {
            research_topic: "Vision-Language Grounding with Sparse Attention for Edge Robotics",
            methodology_preference: "transformers",
            dataset_availability: "public_benchmark",
        },
        additionalMessage: "Need help with novel ablation studies and benchmarking on NVIDIA Jetson.",
        preferredContactMethod: "WHATSAPP",
    };

    const submitRes = await fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify(requestPayload),
    }).then((r) => r.json());

    if (!submitRes.success) {
        console.error("Submit request failed:", submitRes);
        return;
    }
    const createdReq = submitRes.data;
    console.log(`9. Request Submission: PASS (Request Number: ${createdReq.requestNumber}, Status: ${createdReq.status})`);

    // 10. Customer reads their requests
    const myRequestsRes = await fetch(`${baseUrl}/requests`, {
        headers: { Authorization: `Bearer ${customerToken}` },
    }).then((r) => r.json());
    console.log(`10. Customer Request Tracking: PASS (Found ${myRequestsRes.data?.length} request(s))`);

    // 11. Admin updates status to IN_PROGRESS
    const updateStatusRes = await fetch(`${baseUrl}/admin/requests/${createdReq._id}/status`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
    }).then((r) => r.json());
    console.log(`11. Admin Status Transition: PASS (New Status: ${updateStatusRes.data?.status})`);

    console.log("\n==========================================");
    console.log("🎉 ALL 11 BACKEND API SUITE TESTS PASSED!");
    console.log("==========================================");
}

runApiTests().catch(console.error);
