<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SpaceTech Hub - Live Launch Dashboard</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: #1e293b;
            --card-header: #0f172a;
            --border-color: #334155;
            --text-primary: #ffffff;
            --text-secondary: #94a3b8;
            --accent-color: #0284c7;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            padding: 40px 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
        }

        header h1 {
            font-size: 2.8rem;
            color: #38bdf8;
            margin-bottom: 10px;
            letter-spacing: 1px;
        }

        header p {
            color: var(--text-secondary);
            font-size: 1.1rem;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 30px;
        }

        .card {
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.2);
        }

        .card-header {
            padding: 18px 20px;
            background: var(--card-header);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-header h3 {
            font-size: 1.15rem;
            color: var(--text-primary);
        }

        .badge {
            background: var(--accent-color);
            color: white;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge.expanded {
            background: #059669; /* Green for expanded views later */
        }

        .video-wrapper {
            position: relative;
            padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
            height: 0;
            background: #000;
        }

        .video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }

        .card-footer {
            padding: 15px 20px;
            font-size: 0.85rem;
            color: var(--text-secondary);
            background: var(--card-bg);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid var(--border-color);
        }
    </style>
</head>
<body>

    <div class="container">
        <header>
            <h1>SpaceTech Hub</h1>
            <p>Integrated Launch & Orbital Video Feed</p>
        </header>

        <!-- Dynamic Grid Container -->
        <div class="grid" id="video-grid"></div>
    </div>

    <script>
        // Central data hub: As you send more links (tile or expanded), 
        // we can easily push them right into this array!
        const spaceData = [
            {
                agency: "SpaceX",
                type: "tile",
                title: "SpaceX Starship - Lift-off",
                // 45:01 (2701s) to 45:15 (2715s)
                url: "https://www.youtube.com/embed/-1wcilQ58hI?start=2701&end=2715&rel=0",
                timeFrame: "45:01 – 45:15"
            },
            {
                agency: "ISRO",
                type: "tile",
                title: "ISRO Chandrayaan-3 - Launch",
                // 0:08 to 0:12
                url: "https://www.youtube.com/embed/Zfr1eVS5iX8?start=8&end=12&rel=0",
                timeFrame: "00:08 – 00:12"
            }
        ];

        // Function to render cards dynamically onto the website
        function renderSpaceHub() {
            const gridContainer = document.getElementById('video-grid');
            gridContainer.innerHTML = "";

            spaceData.forEach(item => {
                const badgeClass = item.type === 'expanded' ? 'badge expanded' : 'badge';
                const cardHTML = `
                    <div class="card">
                        <div class="card-header">
                            <h3>${item.title}</h3>
                            <span class="${badgeClass}">${item.agency} (${item.type})</span>
                        </div>
                        <div class="video-wrapper">
                            <iframe src="${item.url}" allowfullscreen></iframe>
                        </div>
                        <div class="card-footer">
                            <span>Time Frame: ${item.timeFrame}</span>
                            <span>Status: Active</span>
                        </div>
                    </div>
                `;
                gridContainer.innerHTML += cardHTML;
            });
        }

        // Initialize rendering on load
        window.onload = renderSpaceHub;
    </script>

</body>
</html>
