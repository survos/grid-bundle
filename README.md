# Survos Grid Bundle

Use the DataTables.net javascript library with Symfony, Twig.



```bash
composer req survos/grid-bundle
```

## 

## Ideas

Import the datasets at https://domohelp.domo.com/hc/en-us/articles/360043931814-Fun-Sample-DataSets
https://www.mytechylife.com/2015/09/29/next-and-previous-row-with-jquery-datatables/
https://github.com/lerocha/chinook-database
http://2016.padjo.org/tutorials/sqlite-data-starterpacks/#more-info-simplefolks-for-simple-sql

# Dev only...

composer config repositories.survos_grid_bundle '{"type": "vcs", "url": "git@github.com:survos/SurvosGridBundle.git"}'

```bash
symfony new grid-demo --webapp --version=next --php=8.2 && cd grid-demo
composer config extra.symfony.allow-contrib true
composer req symfony/asset-mapper symfony/stimulus-bundle:2.x-dev
composer req survos/grid-bundle survos/scraper-bundle

# make it prettier with bootstrap, but not necessary
bin/console importmap:require bootstrap
echo "import 'bootstrap/dist/css/bootstrap.min.css'" >> assets/app.js

bin/console make:controller grid -i
cat > templates/grid.html.twig <<END
{% extends 'base.html.twig' %}

{% block body %}
    {% set data = request_data('https://jsonplaceholder.typicode.com/users') %}
    <twig:grid :data="data" :columns="data[0]|keys">
        <twig:block name="id">
            {{ row.id }}
        </twig:block>
        <twig:block name="title">
            <i>{{ row.title }}</i>
        </twig:block>
    </twig:grid>
    </table>
{% endblock %}
END
symfony server:start -d
symfony open:local --path=/grid
```
