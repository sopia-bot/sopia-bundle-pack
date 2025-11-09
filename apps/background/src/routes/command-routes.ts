import { Router } from 'express';
import { 
  getCommandTemplates, 
  updateCommandTemplates, 
  updateCommandTemplate,
  resetCommandTemplate 
} from './command';

const router = Router();

// 전체 명령어 템플릿 조회
router.get('/', getCommandTemplates);

// 전체 명령어 템플릿 업데이트
router.put('/', updateCommandTemplates);

// 특정 명령어 템플릿 업데이트
router.put('/:commandName', updateCommandTemplate);

// 특정 명령어 템플릿 기본값으로 리셋
router.post('/:commandName/reset', resetCommandTemplate);

export default router;

