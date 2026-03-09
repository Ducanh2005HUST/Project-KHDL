# News RAG Chatbot

Chatbot hỏi đáp tin tức tiếng Việt sử dụng kỹ thuật RAG (Retrieval-Augmented Generation). Hỗ trợ trả lời câu hỏi dựa trên tập dữ liệu tin tức được tự động thu thập từ 3 nguồn báo: **VnExpress**, **Tuổi Trẻ**, và **Thanh Niên**.

---

## Kiến trúc Hệ thống

- **Frontend:** React + TailwindCSS (Vite)
- **Backend:** FastAPI (Python)
  - **Crawler:** Thu thập tin tức qua RSS feeds (tự động cập nhật mỗi 60 phút).
  - **Vector DB:** ChromaDB (Lưu trữ và tìm kiếm vector).
  - **Embedder:** `text-embedding-3-small` (OpenAI).
  - **LLM:** `gpt-4o-mini` (Mặc định) / `claude-3-5-haiku` (Dự phòng).

---

## Yêu cầu Môi trường

- **Python** 3.10+
- **Node.js** 18+
- API Key: `OPENAI_API_KEY` (Bắt buộc), `ANTHROPIC_API_KEY` (Trường hợp muốn dùng fallback)

---

## Hướng dẫn Cài đặt & Khởi chạy

### 1. Khởi động Backend (FastAPI)

```bash
cd backend

# Tạo thư mục môi trường ảo và kích hoạt
python -m venv venv
venv\Scripts\activate

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Tạo và cấu hình biến môi trường
copy .env.example .env
# Lưu ý: Mở file .env và điền đầy đủ các API key

# Khởi chạy server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend URL:** `http://localhost:8000`
- **Swagger API Docs:** `http://localhost:8000/docs`

### 2. Khởi động Frontend (React)

```bash
cd frontend

# Cài đặt dependencies
npm install

# Khởi chạy dev server
npm run dev
```
- **Frontend URL:** `http://localhost:5173`

---

## API Endpoints Chính

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/chat` | Gửi câu hỏi, nhận câu trả lời và danh sách nguồn trích dẫn |
| `GET` | `/stats` | Xem thống kê số bài báo và chunk đang có trong DB |
| `GET` | `/health` | Kiểm tra trạng thái sống của server |

**Ví dụ Payload cho `/chat`:**
```json
{
  "question": "Cho tôi biết các tin tức công nghệ mới nhất?",
  "filters": {
    "sources": ["VnExpress"],
    "categories": ["Cong nghe"]
  }
}
```

---

## Danh mục Dữ liệu Hỗ trợ (RSS)

| Chủ đề | VnExpress | Tuổi Trẻ | Thanh Niên |
| :--- | :---: | :---: | :---: |
| **Công nghệ** | x | x | x |
| **Kinh tế** | x | x | x |
| **Thể thao** | x | x | x |
| **Thế giới** | x | x | x |