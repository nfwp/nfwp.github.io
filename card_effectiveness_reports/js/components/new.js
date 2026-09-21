            if (cat.type === 'card' || cat.type === 'exhibit') {
                const sortedItems = Object.entries(items).sort(([, a], [, b]) => b - a).slice(0, 100);
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
                    const headerAvg = lang === 'ja' ? 'Avg/Run' : 'Avg/Run';
                    categoryBlockHtml += `<div style="max-height: 600px; overflow-y: auto;"><table class="act-trend-table" style="width: 100%; border-collapse: collapse;"><thead><tr style="text-align: left; position: sticky; top: 0; background: #f8f8f8;"><th style="padding: 8px; width: 40px;">${headerRank}</th><th style="padding: 8px;">${headerName}</th><th style="padding: 8px; width: 80px;">${headerAvg}</th></tr></thead><tbody>`;

                    sortedItems.forEach(([id, count], index) => {
                        const currentRank = index + 1;
                        const perRun = (count / totalRuns).toFixed(2);
                        // (以降の表示ロジック)