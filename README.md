# Americana - Excel Data Processing System

A comprehensive Node.js and React application for processing Excel files, storing data in PostgreSQL, and providing a modern web interface for data management and analysis.



### Backend Features
- **Excel File Processing**: Support for .xlsx, .xlsm, .xls files
- **ZIP Archive Support**: Process multiple Excel files from ZIP archives
- **PostgreSQL Storage**: Efficient data storage with proper indexing
- **Macro Calculations**: Support for Excel formulas and macro processing
- **RESTful API**: Comprehensive API for data access and manipulation
- **File Upload**: Robust file upload with progress tracking
- **Export Capabilities**: Export data back to Excel formats or CSV

### Frontend Features
- **Modern React UI**: Clean, responsive interface built with React 18
- **File Upload Interface**: Drag-and-drop file upload with progress indicators
- **Data Visualization**: Interactive spreadsheet-like data viewer
- **Workbook Management**: Browse and manage uploaded workbooks
- **Real-time Data**: Live data updates using React Query
- **Export Functions**: Download data in various formats
- **Search & Filter**: Advanced data search and filtering capabilities

##  Project Structure

```
Americana-new/
├── backend/                 # Node.js backend server
│   ├── config/             # Database and app configuration
│   ├── controllers/        # API route controllers
│   ├── models/            # Database models and schemas
│   ├── routes/            # API route definitions
│   ├── uploads/           # File upload directory
│   ├── exports/           # Export files directory
│   ├── temp/              # Temporary file processing
│   └── server.js          # Main server file
├── frontend/               # React frontend application
│   ├── public/            # Static assets
│   └── src/               # React source code
│       ├── components/    # Reusable React components
│       ├── pages/         # Main page components
│       ├── services/      # API service functions
│       └── App.js         # Main App component
└── README.md              # This file
```

##  Technology Stack

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Multer** - File upload handling
- **XLSX** - Excel file processing
- **AdmZip** - ZIP file handling
- **Helmet** - Security middleware
- **Morgan** - Request logging
- **CORS** - Cross-origin resource sharing

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Styled Components** - CSS-in-JS styling
- **React Query** - Data fetching and state management
- **React Dropzone** - File upload interface
- **React Window** - Virtual scrolling for large datasets
- **Lucide React** - Modern icon library
- **React Hot Toast** - Notification system

##  Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Americana-new
   ```

2. **Setup the database**
   ```bash
   # Create PostgreSQL database
   createdb americana_db
   
   # Run the schema setup
   psql -d americana_db -f backend/models/database.sql
   ```

3. **Backend setup**
   ```bash
   cd backend
   
   # Install dependencies
   npm install
   
   # Copy environment configuration
   cp config.env.example .env
   
   # Edit .env file with your database credentials
   nano .env
   ```

4. **Frontend setup**
   ```bash
   cd ../frontend
   
   # Install dependencies
   npm install
   ```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=americana_db
DB_USER=postgres
DB_PASSWORD=your_password

# File Upload Configuration
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The API server will start on http://localhost:5000

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   The React app will start on http://localhost:3000

##  API Documentation

### Upload Endpoints
- `POST /api/upload` - Upload Excel files or ZIP archives
- `GET /api/upload` - Get upload history
- `GET /api/upload/status/:fileId` - Get upload status

### Data Endpoints
- `GET /api/data/workbooks` - List all workbooks
- `GET /api/data/workbooks/:id` - Get specific workbook with worksheets
- `GET /api/data/worksheets/:id` - Get worksheet data
- `GET /api/data/worksheets/:id/range` - Get data by cell range
- `PUT /api/data/worksheets/:worksheetId/cells/:row/:col` - Update cell data

### Export Endpoints
- `GET /api/export/workbooks/:id` - Export workbook (Excel/CSV)
- `GET /api/export/worksheets/:id` - Export worksheet
- `POST /api/export/workbooks/:id/macros` - Create macro calculation

##  Database Schema

The application uses PostgreSQL with the following main tables:

- **uploaded_files** - Tracks uploaded files and their status
- **workbooks** - Excel workbook metadata
- **worksheets** - Individual worksheet information
- **sheet_data** - Cell-level data storage
- **macro_calculations** - Excel formula and macro storage
- **export_jobs** - Export operation tracking

##  Usage Guide

### Uploading Files

1. Navigate to the Upload page
2. Drag and drop Excel files or ZIP archives
3. Monitor upload progress
4. View processing status in real-time

### Managing Data

1. Browse workbooks on the Workbooks page
2. Click on a workbook to view its worksheets
3. Click on a worksheet to view the actual data
4. Use search and filter features to find specific data

### Exporting Data

1. From any workbook or worksheet view
2. Click the Export button
3. Choose your preferred format (XLSX, XLSM, CSV)
4. Download will start automatically

##  Security Features

- **Rate Limiting** - API request rate limiting
- **File Validation** - Strict file type and size validation
- **SQL Injection Protection** - Parameterized queries
- **CORS Configuration** - Controlled cross-origin access
- **Helmet Security** - Standard security headers

## Performance Optimizations

- **Connection Pooling** - PostgreSQL connection pooling
- **Batch Processing** - Efficient bulk data insertion
- **Virtual Scrolling** - Handle large datasets in the UI
- **React Query Caching** - Intelligent data caching
- **File Cleanup** - Automatic temporary file cleanup

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set up proper CORS origins
4. Configure file upload limits

### Build Commands
```bash
# Build frontend for production
cd frontend
npm run build

# Start production server
cd backend
npm start
```

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify PostgreSQL is running
- Check database credentials in .env
- Ensure database exists and schema is loaded

**File Upload Issues**
- Check file size limits (default 100MB)
- Verify upload directory permissions
- Ensure supported file formats (.xlsx, .xlsm, .xls, .zip)

**Frontend Build Errors**
- Clear node_modules and reinstall dependencies
- Check Node.js version compatibility
- Verify all environment variables are set

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

##  Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the API documentation

---

