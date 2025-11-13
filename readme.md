

# 💊 Pharmacy Management System – Backend

Robust, scalable এবং secure backend system যা Pharmacy Management System-এর জন্য API, authentication, billing, inventory, reports এবং role-based access পুরোপুরি হ্যান্ডেল করে।

This backend powers the complete workflow for the **Pharmacy Management Platform**.

---

## 🚀 Key Features

### 🔐 Authentication & Security

* JWT-based secure authentication
* Password hashing (bcrypt)
* Role-Based Access Control (RBAC)
* Protected routes for sensitive operations
* Token expiration & refresh handling
* Input sanitization & validation

---

## 👥 Role-Based Access Control (RBAC)

System এ বিভিন্ন ব্যবহারকারীর বিভিন্ন লেভেল অ্যাক্সেস:

| Role                 | Access Level                                                |
| -------------------- | ----------------------------------------------------------- |
| **Admin**            | Full control: Users, Medicines, Inventory, Reports, Billing |
| **Manager**          | Inventory, Sales, Reports                                   |
| **Staff**            | Sales, Billing only                                         |
| **Viewer / Support** | Read-only access (optional)                                 |

RBAC ensures:

* Unauthorized request → auto blocked
* Role-restricted endpoints
* Secure and organized workflow

---

## 📦 Core Modules

### **1. User Management**

* Create, update, delete users
* Assign roles
* Login, Logout
* Auth-protected routes

### **2. Medicine / Product Management**

* Add new medicines
* Update details (price, stock, expiry, batch etc.)
* Delete or deactivate items
* Search & filter medicines
* Fully RESTful structure

### **3. Inventory / Stock**

* Real-time stock tracking
* Expiry monitoring
* Low-stock alerts (backend flags)
* Auto stock update during billing

### **4. Sales & Billing**

* Create sales entries
* Apply discounts
* Auto total calculation
* Generate invoice data
* Connects with frontend PDF generator

### **5. Reports System**

* Date-wise filters
* Daily/Weekly/Monthly sales reports
* Export-ready structured data
* Admin/Manager only access

---

## 🏗️ Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB + Mongoose**
* **JWT Authentication**
* **bcrypt**
* **dotenv**
* **cors**
* **Zod / Joi / Validator** (if used)
* Clean MVC folder structure
* Modular route system

---

## 📁 Project Structure

```
medicine-server/
│── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── index.js
│
│── .env
│── package.json
│── README.md
```

---

## 🔌 API Endpoints (Summary)

### **Auth**

* POST `/auth/login`
* POST `/auth/register` (Admin only)

### **Users**

* GET `/users/`
* PATCH `/users/:id`
* DELETE `/users/:id`

### **Medicines**

* POST `/medicines`
* GET `/medicines`
* GET `/medicines/:id`
* PATCH `/medicines/:id`
* DELETE `/medicines/:id`

### **Inventory**

* GET `/inventory`
* PATCH `/inventory/update`

### **Billing**

* POST `/sales`
* GET `/sales/:id`

### **Reports**

* GET `/reports/sales?from= &to=`

(প্রয়োজনে আমি full detailed API documentation যোগ করে দিতে পারি)

---

## ⚙️ Environment Variables

`.env` ফাইলে নিচের কীগুলো সেট করতে হবে:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

---

## ▶️ Installation & Run

### **1. Clone Repo**

```
git clone https://github.com/walid-official/medicine-server.git
cd medicine-server
```

### **2. Install Packages**

```
npm install
```

### **3. Setup Environment**

```
cp .env.example .env
```

(আপনার values দিন)

### **4. Start Server**

```
npm run dev
```

Server will run at:
**[http://localhost:5000](http://localhost:5000)**

---

## 🛡️ Security Highlights

* Protected API routes
* Strong JWT-based auth
* Request validation
* Rate-limit ready structure
* CORS configured
* Production-ready folder system

---

## 📈 Future Enhancements

* Supplier & Purchase Order module
* Automatic stock refill algorithm
* Notification system (SMS / Email)
* GST/VAT auto-calculations
* Offline mode sync
* API versioning (v1 → v2)
* Redis cache for faster reads
* Advanced analytics endpoints

---

## 🤝 Contributing

PRs, issues, and suggestions are always welcome!

---

## 🧑‍💻 Author

**Backend of Pharmacy Management System**
Designed for scalability, performance, and real-world pharmacy operations.

---
