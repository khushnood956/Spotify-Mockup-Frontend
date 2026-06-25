# MNIST Digit Classification System

A complete end-to-end handwritten digit recognition system built with machine learning and microservices architecture. Classify handwritten digits (0-9) with high accuracy using a trained CNN model.

## 🎯 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│              HTML5 Canvas Drawing Interface              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/JSON
┌────────────────────▼────────────────────────────────────┐
│              Spring Boot REST API Gateway               │
│         (Java - Port 8080)                              │
│  ✓ Request Validation  ✓ Error Handling                │
│  ✓ Service Health Check  ✓ CORS Support                │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────┐
│         Python FastAPI Inference Service                │
│           (Port 8000 - ML Model Server)                │
│    ✓ CNN Model Loading  ✓ Real-time Predictions       │
│    ✓ Confidence Scores  ✓ Performance Metrics         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         Trained CNN Model (mnist_cnn_model.h5)         │
│              TensorFlow/Keras Model                     │
│   Trained on MNIST Dataset (60K training images)       │
└─────────────────────────────────────────────────────────┘
```

## 📋 Project Structure

```
├── docs/                                    # Documentation
│   ├── ARCHITECTURE.md                      # System architecture & design
│   ├── ML_MODEL.md                          # ML model layer documentation
│   ├── INFERENCE_SERVICE.md                 # Python FastAPI service
│   ├── SPRING_BOOT_API.md                   # Java REST API gateway
│   ├── FRONTEND.md                          # React frontend documentation
│   ├── API_ENDPOINTS.md                     # Complete API reference
│   └── SETUP_GUIDE.md                       # Installation & setup instructions
│
├── ml-model/                                # Machine Learning Layer
│   ├── ML_LAB-MID(SP24-BCS-051-076).ipynb  # Jupyter notebook with full ML pipeline
│   ├── mnist_cnn_model.h5                  # Trained CNN model (binary format)
│   └── README.md                            # ML model documentation
│
├── python-inference-service/                # Python FastAPI Service (Layer 2)
│   ├── main.py                             # FastAPI application & endpoints
│   ├── test_main.py                        # Service tests
│   ├── requirements.txt                    # Python dependencies
│   ├── Dockerfile                          # Docker configuration
│   └── README.md                           # Service documentation
│
├── spring-boot-api/                        # Java Spring Boot API (Layer 3)
│   ├── pom.xml                             # Maven dependencies & build config
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/digitclassification/
│   │   │   │   ├── DigitClassificationApiApplication.java
│   │   │   │   ├── config/
│   │   │   │   │   └── WebClientConfig.java
│   │   │   │   ├── controller/
│   │   │   │   │   └── PredictionController.java
│   │   │   │   ├── dto/
│   │   │   │   │   ├── PredictionRequest.java
│   │   │   │   │   ├── PredictionResponse.java
│   │   │   │   │   └── ErrorResponse.java
│   │   │   │   ├── service/
│   │   │   │   │   └── PredictionService.java
│   │   │   │   └── exception/
│   │   │   │       └── GlobalExceptionHandler.java
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── Dockerfile                          # Docker configuration
│   └── README.md                           # Service documentation
│
├── frontend/                                # Frontend Layer (Layer 4)
│   ├── mnist-classifier.html               # Main application (React-based)
│   ├── index.html                          # Alternative HTML entry point
│   ├── css/
│   │   └── styles.css                      # Styling
│   ├── js/
│   │   └── app.js                          # Frontend logic
│   └── README.md                           # Frontend documentation
│
├── extras/                                  # Additional Resources
│   ├── mnist-classifier.jsx                # React component (reference)
│   └── deployment/                         # Deployment configs
│       ├── docker-compose.yml              # Multi-container orchestration
│       └── kubernetes/                     # K8s deployment manifests
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml                       # CI/CD pipeline
│
├── docker-compose.yml                      # Local development setup
└── .gitignore                              # Git ignore rules
```

## 🚀 Quick Start

### Prerequisites
- **Java 17+** (for Spring Boot)
- **Python 3.9+** (for FastAPI service)
- **Node.js** (optional, for frontend development)
- **Docker & Docker Compose** (for containerized setup)

### Option 1: Using Docker Compose (Recommended)
```bash
# Clone the repository
git clone https://github.com/khushnood956/ML-Digit_Predictor.git
cd ML-Digit_Predictor

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Spring Boot API: http://localhost:8080
# Python Service: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Step 1: Python FastAPI Service
```bash
cd python-inference-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start service
python main.py
# Service runs on http://localhost:8000
```

#### Step 2: Spring Boot API
```bash
cd ../spring-boot-api

# Build project
mvn clean install

# Run application
mvn spring-boot:run
# API runs on http://localhost:8080
```

#### Step 3: Frontend
```bash
cd ../frontend

# Open in browser
open mnist-classifier.html  # Or open with your favorite browser
```

## 📚 Documentation

Each component has detailed documentation:

| Component | Documentation | Purpose |
|-----------|---|---|
| **ML Model** | [ML_MODEL.md](docs/ML_MODEL.md) | Model architecture, training details, dataset info |
| **Python Service** | [INFERENCE_SERVICE.md](docs/INFERENCE_SERVICE.md) | API endpoints, model serving, performance |
| **Spring Boot API** | [SPRING_BOOT_API.md](docs/SPRING_BOOT_API.md) | Gateway, routing, configuration |
| **Frontend** | [FRONTEND.md](docs/FRONTEND.md) | UI components, drawing canvas, API integration |
| **API Reference** | [API_ENDPOINTS.md](docs/API_ENDPOINTS.md) | Complete endpoint documentation with examples |
| **Setup Guide** | [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) | Detailed installation instructions |

## 🔌 API Endpoints

### Python FastAPI Service (Port 8000)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/predict` | POST | Classify handwritten digit |
| `/health` | GET | Service health status |
| `/docs` | GET | Interactive API documentation (Swagger UI) |

**Example Request:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"pixels": [0, 0, ..., 255, 0] }' # 784 values for 28x28 image
```

### Spring Boot API (Port 8080)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/predict` | POST | Classify digit (validates & calls Python service) |
| `/health` | GET | API health status |

**Example Request:**
```bash
curl -X POST http://localhost:8080/api/predict \
  -H "Content-Type: application/json" \
  -d '{"pixels": [0, 0, ..., 255, 0]}'
```

## 📊 Model Information

- **Model Type**: 2D Convolutional Neural Network (CNN)
- **Dataset**: MNIST (60,000 training images, 10,000 test images)
- **Input**: 28×28 grayscale images
- **Output**: Digit classification (0-9) with confidence score
- **Framework**: TensorFlow/Keras
- **Model File**: `mnist_cnn_model.h5` (Loaded by Python service on startup)

## 🧪 Testing

### Python Service Tests
```bash
cd python-inference-service
python -m pytest test_main.py -v
```

### Manual Testing with cURL
```bash
# Generate sample pixel data and test
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d @sample_request.json
```

## 🐳 Docker Deployment

### Build Images
```bash
# Build Python service
docker build -t mnist-python-service ./python-inference-service

# Build Spring Boot API
docker build -t mnist-spring-api ./spring-boot-api
```

### Run Containers
```bash
docker-compose up -d
```

## 📈 Performance

- **Model Inference**: ~50-100ms (on CPU)
- **API Response Time**: ~100-150ms (including network overhead)
- **Model Accuracy**: ~98% on MNIST test set

## 🔒 Security Features

- ✓ Input validation on all endpoints
- ✓ CORS configuration
- ✓ Error handling & logging
- ✓ Health checks
- ✓ Request/response validation (Pydantic + Spring validation)

## 🛠️ Development Workflow

### For Model Updates
1. Update the Jupyter notebook (`ML_LAB-MID(SP24-BCS-051-076).ipynb`)
2. Retrain and export model as `mnist_cnn_model.h5`
3. Replace the model file in `python-inference-service/`
4. Restart the Python service

### For API Changes
1. Update Spring Boot controller in `spring-boot-api/src/main/java/com/example/digitclassification/controller/`
2. Update DTOs if needed
3. Run tests: `mvn test`
4. Rebuild: `mvn clean install`

### For Frontend Changes
1. Modify HTML/JS in `frontend/mnist-classifier.html`
2. Test in browser
3. For production, optimize and minify

## 🚢 Deployment

### Production Checklist
- [ ] Update model with production-grade training
- [ ] Configure logging & monitoring
- [ ] Set up CI/CD pipeline
- [ ] Configure environment variables
- [ ] Security audit
- [ ] Performance testing
- [ ] Load testing

See [SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for detailed production deployment.

## 📝 Configuration

### Environment Variables

**Python Service** (`.env` file)
```
MODEL_PATH=./mnist_cnn_model.h5
LOG_LEVEL=INFO
```

**Spring Boot API** (`application.properties`)
```
python.service.url=http://localhost:8000
python.service.timeout=30000
spring.application.name=digit-classification-api
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📧 Contact
For queries regarding the model training setup or API routing details, please open a GitHub Issue or reach out to: **khushnoodahmed956@gmail.com**.

## 🔗 Related Resources
- [MNIST Dataset Documentation](http://yann.lecun.com/exdb/mnist/)
- [TensorFlow/Keras Documentation](https://www.tensorflow.org/api_docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)

---
**Last Updated**: April 2025  
**Status**: Active Development  
**Developer**: Khushnood Ahmed
