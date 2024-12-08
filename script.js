"use strict";

(async() => {
    const matchup_stats = await fetch(
        'dataset.json',
        {
            headers: {
                "Content-Type": "application/json",
                "Accept": 'application/json'
            }
        }
    )
        .then(res => res.json())
        .catch(err => console.error(err));
    
    const key_to_champion_name = (key) => {
        return key.replace("Alistar_vs_", "").replaceAll("_", " "); // remove prefix
    }
    
    const champion_name_to_key = (champion_name) => {
        return "Alistar_vs_" + champion_name.replaceAll(" ", "_"); // add prefix back
    }
    
    const capitalize_string = (string) => {
        return string[0].toUpperCase() + string.substring(1);
    }
    
    const get_champion_name_icon_url = (champion_name) => {
        const urlName = champion_name
            .replaceAll(" ", "") // Aurelion_Sol => AurelionSol
            .replaceAll("'G", "g") // Cho'Gath => Chogath
            .replaceAll("K'S", "KS") // K'Sante => KSante
            .replaceAll("k'S", "kS") // Rek'Sai => RekSai
            .replaceAll("'S", "s") // Kai'Sa => Kaisa
            .replaceAll("'", "") // Kog'Maw => KogMaw
            .replace("Wukong", "MonkeyKing")
        return `https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/${urlName}.png`;
    }
    
    const get_effectiveness_color = (effectiveness) => {
        const effectiveness_colors = ["#ff6666", "#ff7f00", "#ffbf00", "#66cc66", "#009900"];
        // 0.0 => 0
        // 0.2 => 1
        // 0.4 => 2
        // 0.6 => 3
        // 0.8 => 4
        // 1.0 => 4
        const effectiveness_color = effectiveness_colors[Math.min(Math.floor(effectiveness / (1.0 / effectiveness_colors.length)), effectiveness_colors.length - 1)];
        return effectiveness_color;
    }
    
    const effectiveness_to_html = (effectiveness) => {
        const effectiveness_string = (effectiveness * 100).toPrecision(3) + "%";
        const effectiveness_color = get_effectiveness_color(effectiveness);
        return `<span style="color:${effectiveness_color}">` + effectiveness_string + "</span>";
    }
    
    const get_value_stats = (stats_key) => {
        let max_champion_names = [];
        let min_champion_names = [];
        let total_value = 0.0;
        let max_value = 0.0;
        let min_value = 1.0;
        
        for (const key in matchup_stats) {
            const champion_name = key_to_champion_name(key);
            const value = matchup_stats[key][stats_key].value;
            
            total_value += value;
            
            if (value > max_value) {
                max_champion_names = [champion_name];
                max_value = value;
            }
            else if (value === max_value) {
                max_champion_names.push(champion_name);
            }
            
            if (value < min_value) {
                min_champion_names = [champion_name];
                min_value = value;
            }
            else if (value === min_value) {
                min_champion_names.push(champion_name);
            }
        }
        
        const average_value = total_value / Object.keys(matchup_stats).length;
        
        return {
            max_champion_names,
            min_champion_names,
            max_value,
            min_value,
            average_value
        };
    }
    
    const string_line_break = (string) => {
        const array = [];
        for (
            let i = 0, line_start_index = 0;
            i <= string.length;
            i++
        ) {
            if (i === string.length || string[i] === ' ') {
                const new_line = string.substring(line_start_index, i)
                if (i === string.length || new_line.length >= 50) { // max number of characters per line
                    array.push(new_line);
                    line_start_index = i + 1;
                }
            }
        }
        return array;
    }
    
    const get_champion_win_favorability = (champion_name) => {
        const champion_key = champion_name_to_key(champion_name);
        return matchup_stats[champion_key].win_favorability.value;
    }
    
    const get_champion_summoner_spell_effectiveness = (champion_name, summoner_spell_name) => {
        const champion_key = champion_name_to_key(champion_name);
        return matchup_stats[champion_key][summoner_spell_name].value;
    }
    
    const get_max_effectiveness_summoner_spell_name = (effectivenesses, exclude_name = "") => {
        let max_summoner_spell_name = "";
        let max_effectiveness = 0.0;
        summoner_spell_names.forEach((summoner_spell_name, index) => {
            if(summoner_spell_name === exclude_name) {
                return;
            }
            const effectiveness = effectivenesses[index];
            if (effectiveness >= max_effectiveness) {
                max_effectiveness = effectiveness;
                max_summoner_spell_name = summoner_spell_name;
            }
        });
        return max_summoner_spell_name;
    }
    
    //
    // Summoner spells
    //
    
    const summoner_spell_names = ["heal", "ignite", "exhaust", "ghost", "flash"];
    
    const summoner_spell_image_srcs = {
        flash: "flash.png",
        ghost: "ghost.png",
        ignite: "ignite.png",
        exhaust: "exhaust.png",
        heal: "heal.png"
    }

    {
        const tooltip_callback_footer = (tooltip_items) => {
            for(const tooltip_item of tooltip_items) {
                const summoner_spell_name = tooltip_item.label.toLowerCase();
                const dataset_label = tooltip_item.dataset.label;
                if (dataset_label.toLowerCase().includes('highest')) {
                    return string_line_break("For: " + get_value_stats(summoner_spell_name).max_champion_names.join(', '))
                }
                else if (dataset_label.toLowerCase().includes('lowest')) {
                    return string_line_break("For: " + get_value_stats(summoner_spell_name).min_champion_names.join(', '))
                }
            }
        };
        
        const context = document.getElementById("summoner_spell_effectiveness_chart_canvas");
        new Chart(context, {
            type: 'bar',
            data: {
                labels: summoner_spell_names.map(name => capitalize_string(name)),
                datasets: [{
                    label: "Average AI-estimated summoner spell effectiveness (%)",
                    backgroundColor: "rgba(255, 205, 86, 0.2)",
                    borderColor: "rgb(255, 205, 86)",
                    data: summoner_spell_names.map(summoner_spell_name => get_value_stats(summoner_spell_name).average_value * 100),
                    borderWidth: 1
                }, {
                    label: "Highest reached AI-estimated summoner spell effectiveness (%)",
                    backgroundColor: "rgba(0, 200, 0, 0.2)",
                    borderColor: "rgb(0, 200, 0)",
                    data: summoner_spell_names.map(summoner_spell_name => get_value_stats(summoner_spell_name).max_value * 100),
                    borderWidth: 1
                }, {
                    label: "Lowest reached AI-estimated summoner spell effectiveness (%)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    borderColor: "rgb(255, 99, 132)",
                    data: summoner_spell_names.map(summoner_spell_name => get_value_stats(summoner_spell_name).min_value * 100),
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            footer: tooltip_callback_footer
                        },
                        footerFont: {
                            style: 'italic',
                            weight: 'normal'
                        },
                        footerColor: 'lightgray'
                    }
                }
            }
        })
    }
    
    //
    // Win favorability
    //
    
    const win_favorability = get_value_stats("win_favorability");
    {
        {
            const tooltip_callback_footer = (tooltip_items) => {
                for(const tooltip_item of tooltip_items) {
                    const dataset_label = tooltip_item.dataset.label;
                    if (dataset_label.toLowerCase().includes('highest')) {
                        return string_line_break("For: " + win_favorability.max_champion_names.join(', '))
                    }
                    else if (dataset_label.toLowerCase().includes('lowest')) {
                        return string_line_break("For: " + win_favorability.min_champion_names.join(', '))
                    }
                }
            };

            const context = document.getElementById("win_favorability_chart_canvas");
            new Chart(context, {
                type: 'bar',
                data: {
                    labels: ["Alistar"],
                    datasets: [{
                        label: "Average AI-estimated win favorability (%)",
                        backgroundColor: "rgba(255, 205, 86, 0.2)",
                        borderColor: "rgb(255, 205, 86)",
                        data: [win_favorability.average_value * 100],
                        borderWidth: 1
                    }, {
                        label: "Highest reached AI-estimated win favorability (%)",
                        backgroundColor: "rgba(0, 200, 0, 0.2)",
                        borderColor: "rgb(0, 200, 0)",
                        data: [win_favorability.max_value * 100],
                        borderWidth: 1
                    }, {
                        label: "Lowest reached AI-estimated win favorability (%)",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        borderColor: "rgb(255, 99, 132)",
                        data: [win_favorability.min_value * 100],
                        borderWidth: 1
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                footer: tooltip_callback_footer
                            },
                            footerFont: {
                                style: 'italic',
                                weight: 'normal'
                            },
                            footerColor: 'lightgray'
                        }
                    }
                }
            })
        }
    }
    
    // 
    // Champions 
    //
    
    {
        const tooltip_callback_footer = (tooltip_items) => {
            for(const tooltip_item of tooltip_items) {
                const key = champion_name_to_key(tooltip_item.label);
                const label = tooltip_item.dataset.label;
                let comment = "";
                if (label.toLowerCase().includes('win')) {
                    comment = matchup_stats[key].win_favorability.comment;
                }
                else for (const summoner_spell_name of summoner_spell_names) {
                    if (label.toLowerCase().includes(summoner_spell_name.toLowerCase())) {
                        comment = matchup_stats[key][summoner_spell_name].comment;
                        break;
                    }
                }
                return string_line_break(comment.replaceAll("**", ""));
            }
        };

        const context = document.getElementById("champions_chart_canvas");
        new Chart(context, {
            type: 'bar',
            plugins: [{
                beforeDraw: chart => {      
                    var ctx = chart.ctx;
                    var xAxis = chart.scales.x;
                    var yAxis = chart.scales.y
                    yAxis.ticks.forEach((value, index) => {  
                        var y = yAxis.getPixelForTick(index);   

                        const iconImage = new Image();
                        iconImage.src = get_champion_name_icon_url(value.label);

                        ctx.drawImage(iconImage, xAxis.left - 140, y - 24, 48, 48);

                        const champion_key = champion_name_to_key(value.label);
                        const effectivenesses = summoner_spell_names.map(summoner_spell_name => matchup_stats[champion_key][summoner_spell_name].value);
                        const max_summoner_spell_name_1 = get_max_effectiveness_summoner_spell_name(effectivenesses);
                        {
                            const max_summoner_spell_image = new Image();
                            max_summoner_spell_image.src = summoner_spell_image_srcs[max_summoner_spell_name_1];
                            ctx.drawImage(max_summoner_spell_image, xAxis.right - 49, y - 41, 24, 24)
                        }

                        {
                            const max_summoner_spell_name_2 = get_max_effectiveness_summoner_spell_name(effectivenesses, max_summoner_spell_name_1);
                            const max_summoner_spell_image = new Image();
                            max_summoner_spell_image.src = summoner_spell_image_srcs[max_summoner_spell_name_2];
                            ctx.drawImage(max_summoner_spell_image, xAxis.right - 49 + 24, y - 41, 24, 24) 
                        }
                    });      
                }
            }],
            data: {
                labels: Object.keys(matchup_stats).map(key_to_champion_name),
                datasets: [{
                    label: "AI-estimated win favorability (%)",
                    backgroundColor: "rgba(0, 0, 0, 0.2)",
                    borderColor: "rgb(0, 0, 0)",
                    data: Object.values(matchup_stats).map(stats => stats.win_favorability.value * 100),
                    borderWidth: 1
                }, {
                    label: "AI-estimated Flash effectiveness (%)",
                    backgroundColor: "rgba(255, 205, 86, 0.2)",
                    borderColor: "rgb(255, 205, 86)",
                    data: Object.values(matchup_stats).map(stats => stats.flash.value * 100),
                    borderWidth: 1
                }, {
                    label: "AI-estimated Ghost effectiveness (%)",
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgb(54, 162, 235)",
                    data: Object.values(matchup_stats).map(stats => stats.ghost.value * 100),
                    borderWidth: 1
                }, {
                    label: "AI-estimated Ignite effectiveness (%)",
                    backgroundColor: "rgba(255, 99, 132, 0.2)",
                    borderColor: "rgb(255, 99, 132)",
                    data: Object.values(matchup_stats).map(stats => stats.ignite.value * 100),
                    borderWidth: 1
                }, {
                    label: "AI-estimated Exhaust effectiveness (%)",
                    backgroundColor: "rgba(139, 69, 19, 0.2)",
                    borderColor: "rgb(139, 69, 19)",
                    data: Object.values(matchup_stats).map(stats => stats.exhaust.value * 100),
                    borderWidth: 1
                }, {
                    label: "AI-estimated Heal effectiveness (%)",
                    backgroundColor: "rgba(0, 200, 0, 0.2)",
                    borderColor: "rgb(0, 200, 0)",
                    data: Object.values(matchup_stats).map(stats => stats.heal.value * 100),
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            footer: tooltip_callback_footer
                        },
                        footerFont: {
                            style: 'italic',
                            weight: 'normal'
                        },
                        footerColor: 'lightgray'
                    }
                },
                indexAxis: 'y',
                maintainAspectRatio: false,
                scales: {
                    x: {
                        position: 'top'
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                layout: {
                    padding: {
                        top: 0,
                        left: 60, // Apply left padding
                        right: 0,
                        bottom: 0
                    }
                }
            }
        })
    }
    
    //
    // Team Analysis
    //
    
    const get_selected_team_vs_champion_names = () => {
        const champion_names = [];
        for (let i = 1; i <= 5; i++) {
            const champion_name = document.querySelector('#champion_select_vs_' + i).value;
            if (champion_name === '') {
                continue;
            }
            champion_names.push(champion_name);
        }
        return champion_names;
    }
    
    const team_analysis_win_favorability_chart = new Chart(
        document.querySelector("#team_analysis_win_favorability_chart_canvas"), {
        type: 'bar',
        data: {
            labels: ["Alistar"],
            datasets: [{
                label: "Average AI-estimated win favorability (%)",
                backgroundColor: "rgba(255, 205, 86, 0.2)",
                borderColor: "rgb(255, 205, 86)",
                data: [win_favorability.average_value * 100],
                borderWidth: 1
            }, {
                label: "Team AI-estimated win favorability (%)",
                backgroundColor: "rgba(0, 200, 0, 0.2)",
                borderColor: "rgb(0, 200, 0)",
                data: [0.0],
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
        }
    })
    
    const team_analysis_summoner_spells_chart = new Chart(
        document.querySelector("#team_analysis_summoner_spells_chart_canvas"), {
        type: 'bar',
        data: {
            labels: summoner_spell_names.map(name => name[0].toUpperCase() + name.substring(1)),
            datasets: [{
                label: "Average AI-estimated summoner spell effectiveness (%)",
                backgroundColor: "rgba(255, 205, 86, 0.2)",
                borderColor: "rgb(255, 205, 86)",
                data: summoner_spell_names.map(summoner_spell_name => get_value_stats(summoner_spell_name).average_value * 100),
                borderWidth: 1
            }, {
                label: "Team AI-estimated summoner spell effectiveness (%)",
                backgroundColor: "rgba(0, 200, 0, 0.2)",
                borderColor: "rgb(0, 200, 0)",
                data: [0.0],
                borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
        }
    })
    
    for (const element of document.querySelectorAll('select.champion_select')) {
        element.innerHTML += `<option value="" default>None</option>`
        for (const key in matchup_stats) {
            const champion_name = key_to_champion_name(key);
            let selected_string = "";
            if (element.id === "champion_select_alistar" && champion_name === 'Alistar') {
                selected_string = " selected";
            }
            else if (element.id === "champion_select_vs_3" && champion_name === 'Aatrox') {
                selected_string = " selected";
            }
            element.innerHTML += `<option value="${champion_name}"${selected_string}>${champion_name}</option>`
        }  
        
        const render_option_and_item = (data, escape) => {
            // not sure what "escape" is btw
            const champion_name = escape(data.text);
            const icon_url = 
                champion_name === "None"
                ? "no_champion.jpg"
                : get_champion_name_icon_url(champion_name);
            return `<div style="display:flex; gap:.5rem; align-items: center;">
                <img src="${icon_url}" width="24" height="24" />
                <span style="flex:1; text-align:left;">${champion_name}</span>
            </div>`
        }
        
        new TomSelect(element, {
            allowEmptyOption: true,
            maxOptions: null,
            render: {
                option: render_option_and_item,
                item: render_option_and_item
            }
        });
    }
    
    document.getElementById("back_to_top_button").addEventListener('click', event => {
        event.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    summoner_spell_names.forEach(summoner_spell_name => {
        document.querySelectorAll('.summoner_spell_' + summoner_spell_name).forEach(element => {
            element.src = summoner_spell_image_srcs[summoner_spell_name];
            element.style.width = "12px";
            element.style['padding-right'] = '2px';
        });
    });
    
    const analyze_team_matchup = () => {
        const vs_champion_names = [...new Set(get_selected_team_vs_champion_names())]; // remove duplicates
        const team_analysis_results_element = document.querySelector('#team_analysis_results');
        
        if (vs_champion_names.length === 0) {
            team_analysis_results_element.style.display = 'none';
            return;
        }
        team_analysis_results_element.style.display = 'block';
        
        //
        // Win favorability
        //
        {
            const chart = team_analysis_win_favorability_chart;
            const total_win_favorability = vs_champion_names.reduce(
                (total, champion_name) => total + matchup_stats[champion_name_to_key(champion_name)].win_favorability.value * 100
            , 0);
            const average_win_favorability = total_win_favorability / vs_champion_names.length;
            chart.data.datasets[1].data = [average_win_favorability];
            chart.update();

            // comments
            
            const comments_ul_element = document.querySelector("#team_analysis_results_win_favorability_comments");
            comments_ul_element.innerHTML = "";
            vs_champion_names
                .toSorted((champion_name_1, champion_name_2) => {
                    return get_champion_win_favorability(champion_name_2) - get_champion_win_favorability(champion_name_1);
                })
                .forEach(champion_name => {
                    const champion_key = champion_name_to_key(champion_name);
                    const win_favorability = get_champion_win_favorability(champion_name);
                    const win_favorability_color = get_effectiveness_color(win_favorability);
                    const comment = matchup_stats[champion_key].win_favorability.comment
                        .replaceAll(".", ".<br>")
                    const win_favorability_comment = `
                            <span style="color:${win_favorability_color};">vs ${champion_name}</span>
                            ${effectiveness_to_html(win_favorability)} WF
                            <br/>
                            <span style="color:gray;">${comment}</span>
                        `
                        .replace(/\*\*([^*]+)\*\*/g, '<em>$1</em>') // **Example** => <em>Example</em>
                        
                    const list_item_html = `<li>${win_favorability_comment}</li>`
                    comments_ul_element.innerHTML += list_item_html + '<br/>';
                })   
        }
        
        //
        // Summoner spells
        //
        {
            const chart = team_analysis_summoner_spells_chart;
            const new_data = [];
            for (const summoner_spell_name of summoner_spell_names) {
                const total_effectiveness = vs_champion_names.reduce(
                    (total, champion_name) => total + matchup_stats[champion_name_to_key(champion_name)][summoner_spell_name].value
                , 0);
                const average_effectiveness = total_effectiveness / vs_champion_names.length;
                new_data.push(average_effectiveness);
            }
            chart.data.datasets[1].data = new_data.map(eff => eff * 100);
            chart.update();
            
            {
                const top_summoner_spell_name = get_max_effectiveness_summoner_spell_name(new_data);
                const second_top_summoner_spell_name = get_max_effectiveness_summoner_spell_name(new_data, top_summoner_spell_name);
                const image_1 = document.querySelector('#team_analysis_results_summoner_spells_recommended_spell_image_1');
                const image_2 = document.querySelector('#team_analysis_results_summoner_spells_recommended_spell_image_2')
                image_1.src = summoner_spell_image_srcs[top_summoner_spell_name];
                image_2.src = summoner_spell_image_srcs[second_top_summoner_spell_name];
            }
            
            const get_new_effectiveness = (summoner_spell_name) => {
                const index = summoner_spell_names.indexOf(summoner_spell_name);
                return new_data[index];
            }
            
            // comments
            
            const comments_ul_element = document.querySelector("#team_analysis_results_summoner_spells_comments");
            comments_ul_element.innerHTML = "";
            summoner_spell_names
                .toSorted((name_1, name_2) => {
                    return get_new_effectiveness(name_2) - get_new_effectiveness(name_1)
                })
                .forEach(summoner_spell_name => {
                    const effectiveness = get_new_effectiveness(summoner_spell_name);
                    const effectiveness_color = get_effectiveness_color(effectiveness);
                    
                    let spell_comments_html = '';
                    vs_champion_names
                        .toSorted((champion_name_1, champion_name_2) => {
                            const a = get_champion_summoner_spell_effectiveness(champion_name_1, summoner_spell_name)
                            const b = get_champion_summoner_spell_effectiveness(champion_name_2, summoner_spell_name)
                            return b - a;
                        })
                        .forEach(champion_name => {
                            const champion_key = champion_name_to_key(champion_name);
                            const champion_effectiveness = get_champion_summoner_spell_effectiveness(champion_name, summoner_spell_name);
                            const champion_effectiveness_color = get_effectiveness_color(champion_effectiveness);
                            const comment = matchup_stats[champion_key][summoner_spell_name].comment
                                .replaceAll(".", ".<br>")
                            const spell_comment = `
                                    <span style="color:${champion_effectiveness_color};">vs ${champion_name}</span>
                                    ${effectiveness_to_html(champion_effectiveness)} WF
                                    <br/>
                                    <span style="color:gray;">${comment}</span>
                                `
                                .replace(/\*\*([^*]+)\*\*/g, '<em>$1</em>') // **Example** => <em>Example</em>
                            spell_comments_html += `<li>${spell_comment}</li>`;
                        })   
                
                    const list_item_html = `<li>
                        <span style="color:${effectiveness_color}">${capitalize_string(summoner_spell_name)}</span>
                        ${effectiveness_to_html(effectiveness)}
                        <ul>${spell_comments_html}</ul>
                    </li>`
                    comments_ul_element.innerHTML += list_item_html + '<br/>';
                })
        }
        
        //
        // Playing against
        //
        {
            // comments
            
            const comments_ul_element = document.querySelector("#team_analysis_results_playing_against_comments");
            comments_ul_element.innerHTML = "";
            vs_champion_names
                .toSorted((champion_name_1, champion_name_2) => {
                    return get_champion_win_favorability(champion_name_1) - get_champion_win_favorability(champion_name_2);
                })
                .forEach(champion_name => {
                    const champion_key = champion_name_to_key(champion_name);
                    const win_favorability = get_champion_win_favorability(champion_name);
                    const win_favorability_color = get_effectiveness_color(win_favorability);
                    const comment = matchup_stats[champion_key].how_to_play_against.value
                        .replaceAll(".", ".<br>")
                    const win_favorability_comment = `
                            <span style="color:${win_favorability_color};">vs ${champion_name}</span>
                            ${effectiveness_to_html(win_favorability)} WF
                            <br/>
                            <span style="color:gray;">${comment}</span>
                        `
                        .replace(/\*\*([^*]+)\*\*/g, '<em>$1</em>') // **Example** => <em>Example</em> 
                    const list_item_html = `<li>${win_favorability_comment}</li>`
                    comments_ul_element.innerHTML += list_item_html + '<br/>';
                })
        }
    }
    
    document.querySelector("#analyze_team_matchup_button").addEventListener('click', analyze_team_matchup);
    analyze_team_matchup();
})()