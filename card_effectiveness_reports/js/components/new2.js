            if (cat.type === 'card' || cat.type === 'exhibit') {
                // ▼▼▼ ここから変更 ▼▼▼
                let sortedItems;
                let isRatioCategory = false;
                let headerValueLabel = lang === 'ja' ? 'Avg/Run' : 'Avg/Run';

                if (cat.key === 'Organize_Ratio') {
                    isRatioCategory = true;
                    headerValueLabel = lang === 'ja' ? '割合' : 'Ratio';

                    const addItems = actData['Add_Card'] || {};
                    const organizeItems = actData['Organize_Card'] || {};
                    const ratioData = [];

                    for (const [id, organizeCount] of Object.entries(organizeItems)) {
                        const addCount = addItems[id] || 0;
                        if (addCount > 0) {
                            const ratio = organizeCount / addCount;
                            ratioData.push([id, ratio]);
                        }
                    }
                    sortedItems = ratioData.sort(([, a], [, b]) => b - a).slice(0, 100);
                } else {
                    const items = actData[cat.key] || {};
                    sortedItems = Object.entries(items).sort(([, a], [, b]) => b - a).slice(0, 100);
                }
                // ▲▲▲ ここまで変更 ▲▲▲

                let removeRankMap = {};
                if (cat.key === 'Organize_Card') {
                    const removeItems = actData['Remove_Card'] || {};
                    const sortedRemoveIds = Object.entries(removeItems).sort(([, a], [, b]) => b - a).map(([id]) => id);
                    sortedRemoveIds.forEach((id, idx) => { removeRankMap[id] = idx + 1; });
                }

                if (sortedItems.length === 0) {
                    categoryBlockHtml += `<p style="color: #999; text-align: center; padding: 20px 0;">${C.no_data}</p>`;
                } else {
                    const headerRank = '#';
                    const headerName = cat.type === 'card' ? (lang === 'ja' ? 'カード名' : 'Card Name') : (lang === 'ja' ? '展示品名' : 'Exhibit Name');
                    // ▼▼▼ headerAvg を headerValueLabel に変更 ▼▼▼
                    categoryBlockHtml += `<div style="max-height: 600px; overflow-y: auto;"><table class="act-trend-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="text-align: left; position: sticky; top: 0; background: #f8f8f8;"><th style="padding: 8px; width: 40px;">${headerRank}</th><th style="padding: 8px;">${headerName}</th><th style="padding: 8px; width: 80px;">${headerValueLabel}</th></tr></thead><tbody>`;

                    // ▼▼▼ [id, count] を [id, value] に変更し、表示ロジックを分岐 ▼▼▼
                    sortedItems.forEach(([id, value], index) => {
                        const currentRank = index + 1;
                        const displayValue = isRatioCategory
                            ? `${(value * 100).toFixed(1)}%`
                            : (value / totalRuns).toFixed(2);
                        // (以降の表示ロジック)