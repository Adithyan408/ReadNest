

# ReadNest 📚

**ReadNest** is a comprehensive e-commerce platform and community hub for book lovers. Moving beyond a simple storefront, it provides a dedicated space for readers to share insights, write blogs, and engage with informative articles in a focused environment.

---

## 🚀 Features

### **For Users**

* **Book Store:** Browse, search, and purchase books with a seamless flow.
* **Blogging Platform:** Write and share insights, articles, and thoughts on books.
* **Secure Payments:** Integrated **Razorpay** gateway for safe transactions.
* **Personal Dashboard:** Manage orders and personal blog posts.
* **Authentication:** Secure login/signup with session handling.

### **For Admins**

* **Inventory Management:** Full CRUD operations for books and categories.
* **User Management:** Oversee community activity and orders.
* **Separate Sessions:** Robust logic to ensure Admin and User sessions remain independent.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB
* **Template Engine:** EJS (Embedded JavaScript)
* **Caching:** Redis (for optimized session handling/performance)
* **Architecture:** MVC (Model-View-Controller)
* **Payments:** Razorpay API

---

## 🏗️ Architecture

This project follows the **MVC (Model-View-Controller)** design pattern to ensure a clean separation of concerns, making the codebase scalable and easy to maintain.

```text
ReadNest/
├── controllers/    # Business logic
├── models/         # Database schemas
├── routes/          # URL endpoints
├── views/           # EJS templates
├── public/          # Static files (CSS, Images, JS)
├── middleware/      # Auth and session checks
└── config/          # Database & Redis configurations

```

---
## Code Quality & Tooling

- ESLint for maintaining consistent code style and identifying potential issues early in the development process
- Prettier for automatic code formatting to ensure uniformity across the codebase
- Robust logging implemented with Winston to facilitate monitoring, debugging, and audit trails
- Centralized environment configuration with schema validation to prevent misconfiguration across environments

---


## 💡 Key Learnings

* **Session Isolation:** Successfully solved a critical bug where user and admin sessions were overlapping, ensuring secure and independent access levels.
* **Real-world Integration:** Gained hands-on experience with payment gateways and caching layers (Redis).
* **Community Focus:** Focused on building a platform that encourages the habit of reading and writing rather than just "buying."

---

