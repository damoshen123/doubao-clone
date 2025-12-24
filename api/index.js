const CLONE_URL = 'https://openspeech.bytedance.com/api/v1/mega_tts/audio/upload';
const STATUS_URL = 'https://openspeech.bytedance.com/api/v1/mega_tts/status';

module.exports = async (req, res) => {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { action, accessToken, appId, speakerId, audioBase64, audioFormat, modelType, language, resourceId } = req.body;
    
    try {
        if (action === 'clone') {
            const model = parseInt(modelType) || 4;
            const resId = model === 4 ? 'seed-icl-2.0' : 'seed-icl-1.0';
            
            const response = await fetch(CLONE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer; ' + accessToken,
                    'Resource-Id': resId,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appid: appId,
                    speaker_id: speakerId,
                    audios: [{ audio_bytes: audioBase64, audio_format: audioFormat || 'mp3' }],
                    source: 2,
                    model_type: model,
                    language: parseInt(language) || 0,
                }),
            });
            
            const data = await response.json();
            
            if (data.BaseResp && data.BaseResp.StatusCode === 0) {
                return res.json({ success: true, message: '音色 ' + data.speaker_id + ' 上传成功！' });
            }
            
            const code = data.BaseResp?.StatusCode || 'N/A';
            let msg = data.BaseResp?.StatusMessage || data.message || '未知错误';
            if (code === 1106) msg += ' (Speaker ID 重复)';
            else if (code === 1107) msg += ' (Speaker ID 未找到)';
            else if (code === 1111) msg += ' (音频无人声)';
            else if (code === 1122) msg += ' (未检测到人声)';
            else if (code === 1123) msg += ' (已达上传限制)';
            
            return res.json({ success: false, error: msg });
        }
        
        if (action === 'status') {
            const response = await fetch(STATUS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer; ' + accessToken,
                    'Resource-Id': resourceId || 'seed-icl-2.0',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ appid: appId, speaker_id: speakerId }),
            });
            
            const data = await response.json();
            
            if (data.BaseResp && data.BaseResp.StatusCode === 0) {
                const statusMap = { 0: '未找到', 1: '训练中', 2: '训练成功', 3: '训练失败', 4: '已激活' };
                return res.json({
                    success: true,
                    status: data.status,
                    statusText: statusMap[data.status] || '未知',
                    version: data.version,
                });
            }
            return res.json({ success: false, error: data.BaseResp?.StatusMessage || '查询失败' });
        }
        
        return res.status(400).json({ error: 'Invalid action' });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
};
