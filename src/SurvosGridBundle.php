<?php

namespace Survos\Grid;

use Survos\Grid\Components\GridComponent;
use Survos\Grid\Components\ItemGridComponent;
use Survos\Grid\Twig\TwigExtension;
use Survos\Kit\AbstractUxBundle;
use Survos\Kit\SurvosKitBundle;
use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\DependencyInjection\Kernel\RequiredBundle;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\DependencyInjection\Reference;
use Twig\Environment;

#[RequiredBundle(SurvosKitBundle::class)]
class SurvosGridBundle extends AbstractUxBundle
{
    public const ASSET_PACKAGE = 'grid';
    // $config is the bundle Configuration that you usually process in ExtensionInterface::load() but already merged and processed
    /**
     * @param array<mixed> $config
     */
    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        parent::loadExtension($config, $container, $builder);

        if (class_exists(Environment::class)) {
            $builder
                ->setDefinition('survos.grid_bundle', new Definition(TwigExtension::class))
                ->setArgument('$propertyAccessor', new Reference('property_accessor'))
                ->addTag('twig.extension')
                ->setPublic(false)
            ;
        }

        $builder->register(GridComponent::class)
            ->setAutowired(true)
            ->setAutoconfigured(true)
            ->setArgument('$twig', new Reference('twig'))
            ->setArgument('$logger', new Reference('logger'))
            ->setArgument('$stimulusController', $config['stimulus_controller'])
            ->setArgument('$registry', new Reference('doctrine'))
        ;

        $builder->register(ItemGridComponent::class)
            ->setAutowired(true)
            ->setAutoconfigured(true)
        ;
    }

    public function configure(DefinitionConfigurator $definition): void
    {
        // since the configuration is short, we can add it here
        $definition->rootNode()
            ->children()
            ->scalarNode('stimulus_controller')->defaultValue('@survos/grid/grid')->end()
            ->scalarNode('widthFactor')->defaultValue(2)->end()
            ->scalarNode('height')->defaultValue(30)->end()
            ->scalarNode('foregroundColor')->defaultValue('green')->end()
            ->end();

        ;
    }
}
