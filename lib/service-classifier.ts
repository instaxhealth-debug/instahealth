/**
 * Service Type Auto-Classifier
 *
 * Automatically classifies products as physical-product or appointment-service
 * based on product name, category, and description patterns
 */

const APPOINTMENT_SERVICE_PATTERNS = {
  categories: [
    'iv-drips',
    'blood-tests',
    'health-screening',
    'medical-consultation',
    'diagnostic',
    'therapy',
    'treatment',
    'spa',
    'beauty',
    'wellness',
    'massage',
    'physiotherapy',
    'dental',
    'veterinary'
  ],

  keywords: [
    'appointment',
    'booking',
    'consultation',
    'session',
    'therapy',
    'treatment',
    'drip',
    'infusion',
    'test',
    'screening',
    'checkup',
    'examination',
    'massage',
    'spa',
    'facial',
    'service',
    'visit',
    'assessment'
  ],

  // Negative patterns that indicate physical product
  physicalProductKeywords: [
    'supplement',
    'vitamin',
    'pill',
    'capsule',
    'tablet',
    'powder',
    'bottle',
    'pack',
    'box',
    'kit',
    'device',
    'equipment',
    'tool'
  ]
};

export interface ClassificationResult {
  serviceType: 'physical-product' | 'appointment-service';
  requiresBooking: boolean;
  confidence: number; // 0-1
  reason: string;
}

/**
 * Classify a product as physical or appointment-based service
 */
export function classifyServiceType(
  productName: string,
  category: string,
  description?: string
): ClassificationResult {
  const name = productName.toLowerCase();
  const cat = category.toLowerCase();
  const desc = (description || '').toLowerCase();
  const combinedText = `${name} ${cat} ${desc}`;

  let score = 0;
  const reasons: string[] = [];

  // Check category (highest weight)
  if (APPOINTMENT_SERVICE_PATTERNS.categories.includes(cat)) {
    score += 50;
    reasons.push(`category "${category}" is service-based`);
  }

  // Check for negative indicators (physical product keywords)
  const hasPhysicalKeywords = APPOINTMENT_SERVICE_PATTERNS.physicalProductKeywords.some(
    keyword => combinedText.includes(keyword)
  );

  if (hasPhysicalKeywords) {
    score -= 40;
    reasons.push('contains physical product keywords');
  }

  // Check for service keywords in name/description
  const matchedKeywords = APPOINTMENT_SERVICE_PATTERNS.keywords.filter(
    keyword => combinedText.includes(keyword)
  );

  if (matchedKeywords.length > 0) {
    score += matchedKeywords.length * 10;
    reasons.push(`contains service keywords: ${matchedKeywords.join(', ')}`);
  }

  // Check for booking URL (legacy indication of service)
  if (desc.includes('book') || desc.includes('schedule') || desc.includes('appointment')) {
    score += 15;
    reasons.push('description mentions booking/scheduling');
  }

  // Determine classification
  const isAppointmentService = score >= 30;
  const confidence = Math.min(100, Math.abs(score)) / 100;

  return {
    serviceType: isAppointmentService ? 'appointment-service' : 'physical-product',
    requiresBooking: isAppointmentService,
    confidence,
    reason: reasons.join('; ') || 'default classification'
  };
}

/**
 * Batch classify multiple products
 */
export function classifyProducts(
  products: Array<{ name: string; category: string; description?: string }>
): ClassificationResult[] {
  return products.map(product =>
    classifyServiceType(product.name, product.category, product.description)
  );
}

/**
 * Get recommended duration for appointment services based on category
 */
export function getDefaultDuration(category: string): number | null {
  const cat = category.toLowerCase();

  const durations: Record<string, number> = {
    'iv-drips': 45,
    'blood-tests': 15,
    'health-screening': 30,
    'medical-consultation': 30,
    'massage': 60,
    'spa': 90,
    'facial': 60,
    'physiotherapy': 45,
    'dental': 30,
    'therapy': 60,
  };

  return durations[cat] || null;
}
