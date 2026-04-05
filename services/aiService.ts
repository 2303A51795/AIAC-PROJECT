
const API_BASE = 'http://localhost:5000';

export interface AIDetection {
  person_count: number;
  prohibited_items: {
    exam_type?: string;
    class?: string;
  }[];
  behaviors: {
    type: string;
  }[];
  head_poses?: Array<{ pitch: number; yaw: number; roll: number }>;
}

export interface FrameResult {
  frame: string;
  result: AIDetection;
}

export interface HealthDetails {
  status: string;
  mediapipe_loaded: boolean;
}

export interface CameraDevice {
  index: number;
  name: string;
}

const fetchJSON = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export const aiService = {
  async getHealthDetails(): Promise<HealthDetails | null> {
    try {
      return await fetchJSON<HealthDetails>(`${API_BASE}/health`);
    } catch {
      return null;
    }
  },

  async startWebcam(deviceIndex: number = 0): Promise<void> {
    await fetchJSON<{ status: string }>(`${API_BASE}/webcam/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_index: deviceIndex })
    });
  },

  async stopWebcam(): Promise<void> {
    await fetch(`${API_BASE}/webcam/stop`, { method: 'POST' });
  },

  async startStream(url: string): Promise<void> {
    await fetchJSON<{ status: string }>(`${API_BASE}/stream/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stream_url: url })
    });
  },

  async stopStream(): Promise<void> {
    await fetch(`${API_BASE}/stream/stop`, { method: 'POST' });
  },

  async getWebcamFrame(): Promise<FrameResult> {
    return fetchJSON<FrameResult>(`${API_BASE}/webcam/frame`);
  },

  async getFrame(): Promise<FrameResult> {
    return fetchJSON<FrameResult>(`${API_BASE}/stream/frame`);
  },

  calculateIntegrityScore(result: AIDetection): number {
    let score = 100;
    score -= result.prohibited_items.length * 15;
    score -= result.behaviors.length * 10;
    if (result.person_count > 10) {
      score -= (result.person_count - 10) * 2;
    }
    return Math.max(0, Math.min(100, score));
  },

  getDetectionStats(result: AIDetection) {
    const stats = {
      phone: 0,
      chit: 0,
      textbook: 0,
      notebook: 0,
      device: 0,
      headTurn: 0,
      leaning: 0,
      multiplePeople: 0,
      detectedCount: result.person_count,
      expectedCount: 0,
    };

    for (const item of result.prohibited_items) {
      const examType = item.exam_type;
      if (examType) {
        switch (examType) {
          case 'PHONE': stats.phone++; break;
          case 'CHIT': stats.chit++; break;
          case 'TEXTBOOK': stats.textbook++; break;
          case 'NOTEBOOK': stats.notebook++; break;
          case 'DEVICE': stats.device++; break;
          default: stats.device++; break;
        }
      } else {
        switch (item.class) {
          case 'cell phone': stats.phone++; break;
          case 'book': stats.textbook++; break;
          case 'notebook': stats.notebook++; break;
          default: stats.device++; break;
        }
      }
    }

    for (const behavior of result.behaviors) {
      switch (behavior.type) {
        case 'HEAD_TURN': stats.headTurn++; break;
        case 'LOOKING_DOWN': stats.leaning++; break;
        case 'LOOKING_AWAY': stats.headTurn++; break;
        case 'PROXIMITY_ALERT': stats.multiplePeople++; break;
      }
    }

    return stats;
  },

  convertDetectionsToAlerts(result: AIDetection) {
    const alerts: Array<{
      type: string;
      seat: string;
      level: string;
      description: string;
      confidence: number;
      score: number;
    }> = [];

    const seatLetters = 'ABCDEFGHIJKLMNOP'.split('');
    
    for (let i = 0; i < result.prohibited_items.length; i++) {
      const item = result.prohibited_items[i];
      const seat = seatLetters[i % seatLetters.length] + Math.floor(i / seatLetters.length + 1);
      const examType = item.exam_type || item.class?.toUpperCase() || 'DEVICE';
      
      alerts.push({
        type: examType,
        seat,
        level: 'MEDIUM',
        description: `Prohibited item detected: ${examType}`,
        confidence: 0.85,
        score: 50
      });
    }

    for (let i = 0; i < result.behaviors.length; i++) {
      const behavior = result.behaviors[i];
      const seat = seatLetters[i % seatLetters.length] + Math.floor(i / seatLetters.length + 1);
      
      alerts.push({
        type: behavior.type,
        seat,
        level: 'LOW',
        description: `Suspicious behavior: ${behavior.type}`,
        confidence: 0.75,
        score: 30
      });
    }

    return alerts;
  }
};
