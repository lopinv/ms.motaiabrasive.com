/**
 * Hệ thống mẫu 13 loại bài viết
 * Mỗi mẫu bao gồm: dàn ý cấu trúc, module bắt buộc, ô biến số, ràng buộc thuật ngữ
 */

export interface ArticleTemplate {
  type: string;
  name: string;
  description: string;
  structure: string[]; // Dàn ý cấp H2
  requiredModules: string[]; // Module bắt buộc: BLUF, khối trả lời trực tiếp, bảng, khối thông tin, FAQ, CTA
  variableSlots: string[]; // Biến có thể chèn
  terminologyConstraints: string[]; // Từ vựng bắt buộc theo bảng thuật ngữ
  minWordCount: number;
  maxWordCount: number;
  ctaType: 'hard' | 'soft';
  buyerJourneyStage: 'understanding' | 'evaluation' | 'comparison' | 'sourcing';
}

export const articleTemplates: Record<string, ArticleTemplate> = {
  'product-comparison': {
    type: 'product-comparison',
    name: 'So sánh sản phẩm',
    description: 'So sánh chuyên sâu hai sản phẩm/giải pháp, giúp người mua lựa chọn theo quy trình',
    structure: [
      'Trả lời trực tiếp: Khi nào chọn A và khi nào chọn B',
      'Bảng khác biệt cốt lõi',
      'Cây quyết định kịch bản ứng dụng',
      'Phân tích chi tiết các tiêu chí thông số',
      'Lỗi thường gặp khi lựa chọn và cách tránh',
      'Danh sách kiểm tra trước khi phê duyệt đơn',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'comparison-table', 'decision-tree', 'spec-table', 'common-mistakes', 'inquiry-checklist', 'FAQ', 'CTA'],
    variableSlots: ['productA', 'productB', 'application', 'material', 'gritRange', 'machineType', 'attachmentSystem'],
    terminologyConstraints: ['Dây mài', 'Đĩa chà nhám', 'Cấp hạt', 'Nền', 'Cách gắn', 'Thông số FEPA'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },

  'multi-product-comparison': {
    type: 'multi-product-comparison',
    name: 'So sánh đa sản phẩm',
    description: 'So sánh ma trận các biến thể khác nhau của cùng nhóm sản phẩm (nền, chất kết, kiểu lỗ, cách cố định)',
    structure: [
      'Trả lời trực tiếp: khác biệt cốt lõi trong một câu',
      'Ma trận so sánh đa chiều',
      'Chi tiết từng biến số với điều kiện vận hành phù hợp',
      'Phân tích đánh đổi hiệu năng và chi phí',
      'Bảng tương thích máy',
      'Khuyến nghị mua bán buôn',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'comparison-table', 'spec-table', 'compatibility-table', 'procurement-advice', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'variants', 'backingTypes', 'bondTypes', 'holePatterns', 'attachmentSystems', 'machineModels'],
    terminologyConstraints: ['Nền vải hoặc giấy', 'Chất kết keo', 'Lưới kim loại', 'Hook & Loop', 'Dán tự dính (PSA)'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },

  'buying-guide': {
    type: 'buying-guide',
    name: 'Hướng dẫn mua hàng',
    description: 'Tham chiếu quyết định lựa chọn theo các trục quy trình, vật liệu, máy, ngân sách',
    structure: [
      'Trả lời trực tiếp: ba bước xác định thông số',
      'Sơ đồ luồng quyết định (bản văn bản)',
      'Bảng các chỉ tiêu chính',
      'Trình tự cấp hạt đề xuất theo vật liệu/quy trình',
      'Danh sách kiểm tra tương thích máy',
      'Tiêu chí đánh giá mẫu',
      'Danh sách thông tin cần có trước khi yêu cầu báo giá',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'decision-flow', 'spec-table', 'grit-sequence-table', 'compatibility-checklist', 'sample-evaluation', 'inquiry-checklist', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'workpieceMaterials', 'processSteps', 'machineTypes', 'budgetRanges', 'gritProgressions'],
    terminologyConstraints: ['Cấp hạt', 'Giai đoạn hoàn thiện', 'Mài loại bỏ', 'Hoàn thiện trung gian', 'Gia công cuối', 'Mức tối thiểu đơn hàng'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'evaluation',
  },

  'technical-guide': {
    type: 'technical-guide',
    name: 'Hướng dẫn kỹ thuật',
    description: 'Phân tích chuyên sâu nguyên lý hạt mài, hệ cấp hạt, nền, chất kết, kiểu lỗ, cách cố định',
    structure: [
      'Trả lời trực tiếp: khái niệm cốt lõi trong 3 câu',
      'Phân tích chi tiết các nguyên lý kỹ thuật',
      'So sánh các hệ tiêu chuẩn (FEPA/ANSI/JIS)',
      'Các tham số ảnh hưởng đến hiệu năng',
      'Bác bỏ các quan niệm kỹ thuật sai phổ biến',
      'Bảng thông số tham chiếu nhanh',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'technical-deep-dive', 'standards-table', 'parameter-impact', 'myth-busting', 'spec-checklist', 'FAQ', 'CTA'],
    variableSlots: ['technicalTopic', 'grainTypes', 'standards', 'parameters', 'performanceMetrics'],
    terminologyConstraints: ['Hạt kim cương tổng hợp', 'Cacbit silic (SiC)', 'Thông số FEPA', 'Tiêu chuẩn quốc tế ISO', 'Chất kết keo', 'Nền vải hoặc giấy'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'application-guide': {
    type: 'application-guide',
    name: 'Hướng dẫn ứng dụng',
    description: 'Phương án quy trình đầy đủ cho từng ngành/điều kiện cụ thể (cấu trúc thép, đóng tàu, dầu khí, gỗ, ô tô)',
    structure: [
      'Trả lời trực tiếp: điểm đau và giải pháp chính của ngành',
      'Chi tiết các quy trình công nghiệp điển hình',
      'Tổ hợp sản phẩm đề xuất và trình tự cấp hạt',
      'Cài đặt thông số vận hành đề xuất',
      'Các điểm an toàn và tuân thủ (SASO/ESMA/GSO)',
      'Đề xuất tối ưu chi phí',
      'Mẫu thông số mua hàng',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'process-breakdown', 'product-recommendation-table', 'grit-sequence-table', 'safety-compliance', 'cost-optimization', 'procurement-template', 'FAQ', 'CTA'],
    variableSlots: ['industry', 'workpieceMaterials', 'processSteps', 'recommendedProducts', 'gritProgressions', 'safetyStandards', 'gccCountry'],
    terminologyConstraints: ['Chuẩn bị bề mặt', 'Loại bỏ phoi và bavia', 'Gia công kim loại', 'Xưởng đóng tàu', 'Bảo trì tàu', 'Ngành dầu khí', 'Thiết bị bảo hộ cá nhân', 'Thông số FEPA'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'evaluation',
  },

  'process-tutorial': {
    type: 'process-tutorial',
    name: 'Hướng dẫn quy trình',
    description: 'Hướng dẫn vận hành từng bước: chuỗi mài, tăng cấp hạt, khử bavia, chuẩn bị bề mặt',
    structure: [
      'Trả lời trực tiếp: tổng quan luồng quy trình chuẩn',
      'Hướng dẫn vận hành chi tiết từng bước (kèm tham số)',
      'Nguyên lý và bảng trình tự tăng cấp hạt',
      'Các điểm kiểm soát quan trọng và tiêu chí kiểm tra chất lượng',
      'Các khuyết tật thường gặp và cách xử lý',
      'Điều chỉnh theo vật liệu khác nhau',
      'Cảnh báo an toàn khi vận hành',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'step-by-step', 'grit-progression-table', 'quality-control', 'defect-troubleshooting', 'material-adjustments', 'safety', 'FAQ', 'CTA'],
    variableSlots: ['processName', 'steps', 'gritProgressions', 'machineSettings', 'qualityCriteria', 'defectTypes', 'materials'],
    terminologyConstraints: ['Giai đoạn hoàn thiện', 'Cấp hạt', 'Mài loại bỏ', 'Hoàn thiện trung gian', 'Gia công cuối', 'Chuẩn bị bề mặt', 'Thiết bị bảo hộ cá nhân'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'troubleshooting': {
    type: 'troubleshooting',
    name: 'Xử lý sự cố',
    description: 'Chẩn đoán và đối sách các vấn đề mài mòn nhanh, nghẽn bụi, dây lệch, hút bụi kém',
    structure: [
      'Trả lời trực tiếp: bảng lỗi-nguyên nhân-giải pháp nhanh',
      'Phân loại dấu hiệu lỗi và logic chẩn đoán',
      'Phân tích chi tiết từng lỗi',
      'Danh sách kiểm tra nguyên nhân gốc',
      'Đề xuất bảo trì phòng ngừa',
      'Khi nào cần chuyển hỗ trợ kỹ thuật từ nhà cung cấp',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'troubleshooting-table', 'root-cause-analysis', 'preventive-maintenance', 'support-escalation', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'failureModes', 'rootCauses', 'correctiveActions', 'preventiveMeasures', 'machineTypes'],
    terminologyConstraints: ['Bụi nghẽn', 'Dây lệch', 'Mài mòn nhanh', 'Hút bụi', 'Nền vải hoặc giấy', 'Chất kết keo'],
    minWordCount: 1000,
    maxWordCount: 1800,
    ctaType: 'soft',
    buyerJourneyStage: 'evaluation',
  },

  'product-spec-detail': {
    type: 'product-spec-detail',
    name: 'Chi tiết thông số sản phẩm',
    description: 'Giải thích đầy đủ tham số cho một nhóm sản phẩm, kích thước, dải cấp hạt, loại nền',
    structure: [
      'Trả lời trực tiếp: định vị cơ bản và phạm vi ứng dụng của thông số',
      'Bảng thông số đầy đủ',
      'Nguyên lý thiết kế và đặc tính hiệu năng',
      'Máy tương thích và điểm lắp đặt',
      'Tùy chọn tùy chỉnh (hạt, kích thước, nền, thương hiệu)',
      'Thông tin đặt hàng: MOQ, thời gian cung ứng, bao bì',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'full-spec-table', 'design-principles', 'compatibility-guide', 'customization-options', 'ordering-info', 'FAQ', 'CTA'],
    variableSlots: ['productModel', 'specs', 'compatibleMachines', 'customizationOptions', 'moq', 'leadTime', 'packagingOptions'],
    terminologyConstraints: ['Mức tối thiểu đơn hàng', 'Thời gian cung ứng', 'Nhà máy trực tiếp', 'Cung ứng theo thương hiệu (OEM)', 'Cấp hạt', 'Nền'],
    minWordCount: 1000,
    maxWordCount: 1800,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'procurement-guide': {
    type: 'procurement-guide',
    name: 'Hướng dẫn mua hàng & tìm nguồn',
    description: 'Cách B2B chuẩn hóa nhu cầu, đánh giá mẫu, so giá, so sánh nhà cung cấp',
    structure: [
      'Trả lời trực tiếp: phương pháp mua hàng chuyên nghiệp trong 5 bước',
      'Mẫu chuẩn hóa thông số kỹ thuật',
      'Phiếu đánh giá mẫu',
      'Ma trận đánh giá nhà cung cấp',
      'Các điểm so sánh cốt lõi giữa các báo giá',
      'Điều khoản hợp đồng và điều kiện giao hàng chính',
      'Bẫy mua hàng thường gặp và cách tránh',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'specification-template', 'sample-evaluation-card', 'supplier-evaluation-matrix', 'quote-comparison', 'contract-terms', 'procurement-pitfalls', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'evaluationCriteria', 'supplierTypes', 'contractTerms', 'incoterms', 'paymentTerms'],
    terminologyConstraints: ['Báo giá / Yêu cầu báo giá', 'Nhà cung cấp bán buôn', 'Nhà phân phối công nghiệp', 'Mức tối thiểu đơn hàng', 'Thời gian cung ứng', 'Yêu cầu mẫu', 'Chứng nhận phù hợp', 'Chứng nhận phân tích'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'wholesale-oem-guide': {
    type: 'wholesale-oem-guide',
    name: 'Hướng dẫn bán buôn / OEM',
    description: 'Thương hiệu riêng, bao bì, mua số lượng lớn, xác nhận mẫu, đánh giá nhà cung cấp',
    structure: [
      'Trả lời trực tiếp: tổng quan quy trình OEM/bán buôn',
      'Ma trận tùy chọn OEM',
      'Thông số thiết kế bao bì thương hiệu',
      'Mức tối thiểu đơn và các bậc giá',
      'Quy trình và tiêu chí duyệt mẫu',
      'Tiêu chuẩn kiểm tra chất lượng và nghiệm thu',
      'Điều phối logistics và hải quan',
      'Khung hợp tác dài hạn đề xuất',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'oem-options-table', 'packaging-specs', 'moq-pricing-tiers', 'sample-approval-process', 'qa-standards', 'logistics-customs', 'partnership-framework', 'FAQ', 'CTA'],
    variableSlots: ['productFamily', 'customizationOptions', 'packagingTypes', 'moqTiers', 'sampleProcess', 'qaParameters', 'shippingTerms', 'gccCountry'],
    terminologyConstraints: ['Cung ứng theo thương hiệu (OEM)', 'Nhà cung cấp bán buôn', 'Mức tối thiểu đơn hàng', 'Thời gian cung ứng', 'Yêu cầu mẫu', 'Chứng nhận phù hợp', 'Bao bì', 'Thương hiệu'],
    minWordCount: 1800,
    maxWordCount: 2500,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'industry-market': {
    type: 'industry-market',
    name: 'Ngành & thị trường',
    description: 'Tiêu chuẩn, quy định an toàn, động thái thị trường — cần nguồn tin thời sự đáng tin cậy',
    structure: [
      'Trả lời trực tiếp: các điểm cốt lõi về xu hướng/thay đổi tiêu chuẩn',
      'Bối cảnh ngành và các yếu tố thúc đẩy',
      'Đọc các cập nhật tiêu chuẩn chính (FEPA/ISO/SASO/ESMA/GSO)',
      'Số liệu quy mô và tăng trưởng thị trường (kèm trích nguồn đáng tin)',
      'Xu hướng kỹ thuật và đổi mới sản phẩm',
      'Tác động đến quyết định mua hàng',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'industry-context', 'standards-analysis', 'market-data', 'technology-trends', 'procurement-implications', 'FAQ', 'CTA'],
    variableSlots: ['industry', 'standardsUpdates', 'marketData', 'technologyTrends', 'regulatoryChanges', 'gccCountry'],
    terminologyConstraints: ['Thông số FEPA', 'Tiêu chuẩn quốc tế ISO', 'SASO', 'ESMA', 'GSO', 'Thiết bị bảo hộ cá nhân', 'Chuẩn bị bề mặt'],
    minWordCount: 1500,
    maxWordCount: 2500,
    ctaType: 'soft',
    buyerJourneyStage: 'understanding',
  },

  'gcc-regional-sourcing': {
    type: 'gcc-regional-sourcing',
    name: 'Tinh tiết tìm nguồn khu vực GCC',
    description: 'Xét cân nhắc cung ứng và logistics hướng đến Saudi/UAE/Qatar/Kuwait/Bahrain/Oman',
    structure: [
      'Trả lời trực tiếp: 3 cân nhắc cốt lõi khi nhập khẩu vào quốc gia này',
      'Bức tranh thị trường và các cụm công nghiệp chính',
      'Quy định nhập khẩu và yêu cầu tuân thủ (SASO/ESMA/GSO)',
      'Tuyến logistics, cảng và thời gian thông quan',
      'Mô hình nhà phân phối/đại lý địa phương',
      'Tỷ giá, phương thức thanh toán và điều khoản thương mại',
      'Các lưu ý văn hóa và thương mại trong giao tiếp',
      'Miễn trừ trách nhiệm: những gì chúng tôi không cam kết tại địa phương',
      'Câu hỏi thường gặp',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'market-overview', 'regulatory-compliance', 'logistics-ports', 'distribution-model', 'payment-terms', 'cultural-notes', 'disclaimer', 'FAQ', 'CTA'],
    variableSlots: ['gccCountry', 'industrialClusters', 'regulations', 'ports', 'leadTimes', 'distributors', 'paymentMethods', 'culturalTips'],
    terminologyConstraints: ['Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'SASO', 'ESMA', 'GSO', 'Thời gian cung ứng', 'Nhà cung cấp bán buôn', 'Nhà phân phối công nghiệp'],
    minWordCount: 1500,
    maxWordCount: 2200,
    ctaType: 'hard',
    buyerJourneyStage: 'sourcing',
  },

  'faq-buyers-guide': {
    type: 'faq-buyers-guide',
    name: 'FAQ / Tài nguyên người mua',
    description: 'Các cụm câu hỏi thực tế của người mua công nghiệp, bộ hỏi-đáp phân theo chủ đề',
    structure: [
      'Trả lời trực tiếp: 3 câu hỏi quan trọng nhất kèm câu trả lời ngắn',
      'Câu hỏi thường gặp gom theo trục (sản phẩm/thông số/mua hàng/kỹ thuật/logistics/sau bán)',
      'Bảng tham chiếu cho các quyết định chính',
      'Mẫu yêu cầu báo giá: tải/hướng dẫn sử dụng',
      'Thẻ thuật ngữ nhanh',
      'Kênh liên lạc và cam kết phản hồi',
    ],
    requiredModules: ['BLUF', 'direct-answer', 'themed-faq', 'decision-reference-table', 'inquiry-template', 'glossary-card', 'contact-info', 'CTA'],
    variableSlots: ['faqGroups', 'decisionCriteria', 'inquiryTemplateFields', 'glossaryTerms', 'contactChannels'],
    terminologyConstraints: ['Báo giá / Yêu cầu báo giá', 'Mức tối thiểu đơn hàng', 'Thời gian cung ứng', 'Yêu cầu mẫu', 'Cấp hạt', 'Nền vải hoặc giấy', 'Cách gắn', 'Cung ứng theo thương hiệu (OEM)'],
    minWordCount: 1200,
    maxWordCount: 2000,
    ctaType: 'hard',
    buyerJourneyStage: 'comparison',
  },
};

export function getTemplate(type: string): ArticleTemplate | undefined {
  return articleTemplates[type];
}

export function getAllTemplateTypes(): string[] {
  return Object.keys(articleTemplates);
}
