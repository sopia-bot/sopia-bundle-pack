import express from 'express';
import logger from '../utils/logger';

const router = express.Router();

// 쓰로틀링 큐 관리
interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  keyword: string;
}

let requestQueue: QueuedRequest[] = [];
let isProcessing = false;
const THROTTLE_DELAY = 500; // 500ms 간격

/**
 * 실제 Spooncast API 호출 함수
 */
async function searchUserAPI(keyword: string): Promise<any> {
  const response = await fetch(
    `https://kr-gw.spooncast.net/search/user?keyword=${encodeURIComponent(keyword)}&page_size=30`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.spooncast.net/',
        'Origin': 'https://www.spooncast.net/',
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * 요청 큐 처리
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const request = requestQueue.shift();

  if (!request) {
    isProcessing = false;
    return;
  }

  try {
    const data = await searchUserAPI(request.keyword);
    request.resolve(data);

    // 다음 요청 처리 (쓰로틀링 딜레이)
    setTimeout(() => {
      isProcessing = false;
      processQueue();
    }, THROTTLE_DELAY);

  } catch (error: any) {
    logger.error('User search API failed', {
      keyword: request.keyword,
      error: error?.message || 'Unknown error'
    });
    request.reject(error);
    isProcessing = false;
    processQueue();
  }
}

/**
 * 사용자 검색 (쓰로틀링 포함)
 * 내부 함수로 직접 호출 가능
 */
export async function searchUser(keyword: string): Promise<any> {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      resolve,
      reject,
      keyword
    });
    processQueue();
  });
}

/**
 * POST /user/search
 * 사용자 검색 (Spooncast API)
 */
router.post('/search', async (req, res) => {
  try {
    const { keyword } = req.body;

    if (!keyword || typeof keyword !== 'string') {
      return res.status(400).json({
        error: 'Keyword is required'
      });
    }

    logger.debug('User search requested', { keyword });

    const result = await searchUser(keyword);
    res.json(result);
  } catch (error: any) {
    logger.error('User search failed', {
      error: error?.message || 'Unknown error',
      stack: error?.stack
    });
    res.status(500).json({
      error: error?.message || 'Failed to search users'
    });
  }
});

export default router;

