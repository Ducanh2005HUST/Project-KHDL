# Plan: Finance Dashboard Integration (Minimal - Data Science Project)

## Mục tiêu
Thêm tính năng phân tích tài chính vào chatbot hiện có, tập trung vào **data analysis & visualization** thay vì complex routing.

## Scope (3-4 giờ làm)

### Phase 1: Backend Finance Endpoints (1 giờ)
- [ ] Thêm 3 endpoints vào `backend/main.py`:
  - `POST /finance/analysis` - phân tích câu hỏi tài chính
  - `GET /finance/trends` - lấy xu hướng gần đây
  - `POST /finance/sentiment` - phân tích cảm xúc thị trường
- [ ] Import `finance_analyzer` module
- [ ] Tạo response models mới trong `models.py`

### Phase 2: Frontend Integration (1.5 giờ)
- [ ] Thêm tab "Phân tích tài chính" vào UI chính
- [ ] Tích hợp `FinanceDashboard` vào tab mới
- [ ] Style đơn giản (reuse Tailwind classes hiện có)

### Phase 3: Demo & Documentation (0.5 giờ)
- [ ] Viết README section về finance features
- [ ] Chụp screenshot dashboard cho báo cáo

## Tech Stack (không thêm dependency mới)
- Backend: FastAPI (có sẵn)
- Frontend: React + Recharts (có sẵn)
- Analysis: NLTK + rule-based (có sẵn)

## Không làm (avoid over-engineering):
- ❌ Không cần smart routing tự động
- ❌ Không cần multi-modal (upload ảnh/biểu đồ)
- ❌ Không cần real-time stock data API
- ❌ Không cần authentication

## Deliverables
1. Finance dashboard với 2 biểu đồ (sentiment + trends)
2. 3 API endpoints mới
3. Demo video 2-3 phút
4. Báo cáo ngắn về methodology (sentiment analysis, trend detection)

## Success Criteria
- Dashboard load được dữ liệu
- Biểu đồ render đúng
- Demo được trong 3 phút
- Code sạch, dễ explain trong defense
